const Donation = require('../models/donation');
const Donor = require('../models/donor');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre'
});

// POST /api/donations - Create a new donation record
exports.createDonation = async (req, res) => {
  try {
    const { donorName, email, phone, city, amount, currency, message, transactionId, paymentStatus, isBloodDonor, bloodGroup } = req.body;

    // if (phone) {
    //   try {
    //     const existingDonor = await Donor.findOne({ where: { phone } });
    //     const donorData = {
    //       name: donorName,
    //       email,
    //       city,
    //       isBloodDonor,
    //       bloodGroup
    //     };

    //     if (existingDonor) {
    //       await existingDonor.update(donorData);
    //     } else {
    //       await Donor.create({
    //         ...donorData,
    //         phone
    //       });
    //     }
    //   } catch (error) {
    //     console.error('Error updating/creating donor:', error);
    //   }
    // }

    // Create Razorpay Order
    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    const newDonation = await Donation.create({
      donorName,
      email,
      phone,
      city,
      amount,
      currency,
      message,
      transactionId: order.id, // Save Razorpay Order ID
      paymentStatus: 'pending',
      isBloodDonor,
      bloodGroup
    });

    // Schedule a delayed status check after 3 minutes
    schedulePaymentStatusCheck(order.id);

    res.status(201).json({
      message: 'Donation recorded successfully',
      donation: newDonation,
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID'
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({ error: 'Failed to process donation', details: error.message });
  }
};

// GET /api/donations - Get all donations
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.findAll({ order: [['createdAt', 'DESC']] });

    // Calculate timestamps for Razorpay queries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const toTimestamp = Math.floor(now.getTime() / 1000);
    const todayFromTimestamp = Math.floor(todayStart.getTime() / 1000);
    const weekFromTimestamp = Math.floor(weekStart.getTime() / 1000);
    const monthFromTimestamp = Math.floor(monthStart.getTime() / 1000);
    const yearFromTimestamp = Math.floor(yearStart.getTime() / 1000);

    // Fetch payment data from Razorpay in parallel
    const [todayPayments, weekPayments, monthPayments, yearPayments, allSubscriptions, allPlans] = await Promise.all([
      razorpay.payments.all({ from: todayFromTimestamp, to: toTimestamp, count: 100 }),
      razorpay.payments.all({ from: weekFromTimestamp, to: toTimestamp, count: 100 }),
      razorpay.payments.all({ from: monthFromTimestamp, to: toTimestamp, count: 100 }),
      razorpay.payments.all({ from: yearFromTimestamp, to: toTimestamp, count: 100 }),
      razorpay.subscriptions.all({ count: 100 }), // Fetch up to 100 subscriptions
      razorpay.plans.all({ count: 100 }) // Fetch up to 100 plans
    ]);

    // Function to calculate total from payments
    const calculateTotal = (payments) => {
      if (!payments || !payments.items) return 0;
      return payments.items
        .filter(p => p.status === 'captured')
        .reduce((sum, p) => sum + p.amount, 0) / 100; // Convert from paise to currency unit
    };

    // Create a lookup map for plan amounts from the fetched plans
    const planAmountMap = new Map();
    if (allPlans && allPlans.items) {
      allPlans.items.forEach(plan => {
        planAmountMap.set(plan.id, plan.item.amount);
      });
    }

    // Calculate active subscriptions and their total monthly value
    const activeSubscriptions = allSubscriptions && allSubscriptions.items
      ? allSubscriptions.items.filter(sub => sub.status === 'active')
      : [];
    const activeSubscriptionsCount = activeSubscriptions.length;
    const activeSubscriptionsTotal = activeSubscriptions
      .reduce((sum, sub) => sum + (planAmountMap.get(sub.plan_id) || 0), 0) / 100; // Get amount from map

    const razorpayStats = {
      today: {
        total: calculateTotal(todayPayments),
        count: (todayPayments.items || []).filter(p => p.status === 'captured').length
      },
      lastWeek: {
        total: calculateTotal(weekPayments),
        count: (weekPayments.items || []).filter(p => p.status === 'captured').length
      },
      thisMonth: {
        total: calculateTotal(monthPayments),
        count: (monthPayments.items || []).filter(p => p.status === 'captured').length
      },
      thisYear: {
        total: calculateTotal(yearPayments),
        count: (yearPayments.items || []).filter(p => p.status === 'captured').length
      },
      activeSubscriptions: {
        total: activeSubscriptionsTotal,
        count: activeSubscriptionsCount
      }
    };

    res.json({ donations, razorpayStats });
  } catch (error) {
    console.error('Error fetching donations and stats:', error);
    res.status(500).json({ error: 'Failed to fetch donations and stats', details: error.message });
  }
};

// GET /api/donations/phone/:phone - Get donation details by phone number
exports.getDonationByPhone = async (req, res) => {
    try {
        const { phone } = req.params;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required.' });
        }

        const donation = await Donor.findOne({
            where: { phone: phone },
            order: [['createdAt', 'DESC']] // Get the latest donation for that number
        });

        if (!donation) {
            return res.status(404).json({ message: 'No donation found with that phone number.' });
        }

        res.status(200).json({
            donorName: donation.name,
            email: donation.email,
            city: donation.city,
            isBloodDonor: donation.isBloodDonor,
            bloodGroup: donation.bloodGroup
        });
    } catch (error) {
        console.error('Error fetching donation by phone:', error);
        res.status(500).json({ error: 'Failed to fetch donation data', details: error.message });
    }
};

exports.getDonorsList = async (req, res) => {
  try {
    const donors = await Donor.findAll({ order: [['createdAt', 'DESC']] });
    res.json(donors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donors list' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ status: 'failure', message: 'Missing required payment details' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre')
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    const donation = await Donation.findOne({ where: { transactionId: razorpay_order_id } });

    if (!donation) {
      return res.status(404).json({ message: 'Donation record not found' });
    }

    if (isAuthentic) {
      try {
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status === 'authorized') {
          await razorpay.payments.capture(razorpay_payment_id, Math.round(donation.amount * 100), donation.currency || 'INR');
        }
      } catch (error) {
        console.error('Error capturing payment:', error);
      }

      if (donation.paymentStatus !== 'completed') {
        donation.paymentStatus = 'completed';
        await donation.save();
        await sendThankYouEmail(donation);

        // Update or create donor when payment is completed
        if (donation.phone) {
          try {
            const normalizedEmail = donation.email ? donation.email.trim().toLowerCase() : null;
            const existingDonor = await Donor.findOne({ where: { phone: donation.phone } });
            const donorData = {
              name: donation.donorName,
              email: normalizedEmail,
              city: donation.city,
              isBloodDonor: donation.isBloodDonor,
              bloodGroup: donation.bloodGroup
            };

            if (existingDonor) {
              await existingDonor.update(donorData);
              console.log(`Donor updated on payment verification: ${donation.phone}`);
            } else if (normalizedEmail) {
              await Donor.create({
                ...donorData,
                phone: donation.phone
              });
              console.log(`New donor created on payment verification: ${donation.phone}`);
            }
          } catch (error) {
            console.error('Error updating/creating donor on payment verification:', error);
          }
        }
      }
      res.json({ status: 'success', message: 'Payment verified successfully' });
    } else {
      donation.paymentStatus = 'failed';
      await donation.save();
      await sendPaymentStatusEmail(donation, 'failed');
      res.status(400).json({ status: 'failure', message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Payment verification failed', details: error.message });
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const donation = await Donation.findOne({ where: { transactionId: orderId } });

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // If still pending in DB, optionally check with Razorpay to be sure
    if (donation.paymentStatus === 'pending') {
      await updateDonationPaymentStatus(orderId);
      await donation.reload();
    }

    res.json({ status: donation.paymentStatus });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Failed to check status', details: error.message });
  }
};

// Helper function to send thank you email
const sendThankYouEmail = async (donation) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'sammed.patil29@gmail.com',
        pass: process.env.EMAIL_PASS || 'dxjw yrxh vpox ndtx'
      }
    });

    const mailOptions = {
      from: `"May I Help You Foundation" <${process.env.EMAIL_USER}>`,
      to: donation.email,
      subject: `Thank You for Your Donation ${donation.transactionId}`,
      html: `
<link href="https://fonts.googleapis.com/css2?family=Anek+Telugu:wght@400;700&family=Luckiest+Guy&display=swap" rel="stylesheet">
<link href="https://fonts.cdnfonts.com/css/cooper-black" rel="stylesheet">
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
  
  <div style="background-color: white; padding: 25px 30px; text-align: center;">
    <img src="https://firebasestorage.googleapis.com/v0/b/may-i-help-you-foundation.firebasestorage.app/o/logo.png?alt=media&token=9ac09ac5-4c97-418c-b070-2495eac88291" alt="May I Help You Foundation Logo" style="width: 120px; height: auto; margin-bottom: 10px; border-radius: 50%;">
    
    <h1 style="font-family: 'Cooper Black', serif; color: #D81B60; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px;">
      May I Help You Foundation
    </h1>
  </div>

  <div style="padding: 40px; color: #333; line-height: 1.6;">
    <h2 style="color: #D81B60; margin-top: 0; "><span style="font-family: luckiest guy, anek telugu, sans-serif">ధన్యవాదాలు </span>(Thank You), ${donation.donorName}!</h2>
    
    <p style="font-size: 16px;font-family: luckiest guy, anek telugu, sans-serif">మీ ఉదారతకు మేము కృతజ్ఞతలు తెలుపుకుంటున్నాము.</p>
    
    <p style="font-size: 16px;">We have successfully received your generous contribution of:</p>
    
    <div style="background-color: #fce4ec; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #D81B60;">
        ${donation.currency} ${donation.amount}
      </span>
    </div>

    <div style="font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 20px;">
      <p><strong>Transaction ID:</strong> ${donation.transactionId}</p>
    </div>

    <p style="margin-top: 30px; font-size: 16px;">
      Your support helps us empower the underprivileged through sustainable initiatives in education and healthcare.
    </p>

    <br>
    <p style="margin: 0; font-weight: bold;">Best Regards,</p>
    <p style="margin: 5px 0; color: #D81B60; font-weight: bold;">Team May I Help You Foundation</p>
  </div>

  <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
    <p>This is an automated receipt for your donation. Thank you for making a difference!</p>
  </div>
</div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending thank you email:', error);
  }
};

const sendPaymentStatusEmail = async (donation, status) => {
  if (!donation || !donation.email) return;

  const subject = status === 'completed'
    ? `Thank You for Your Donation ${donation.transactionId}`
    : `Donation Payment Failed - ${donation.transactionId}`;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'sammed.patil29@gmail.com',
        pass: process.env.EMAIL_PASS || 'dxjw yrxh vpox ndtx'
      }
    });

    const mailOptions = {
      from: `"May I Help You Foundation" <${process.env.EMAIL_USER}>`,
      to: donation.email,
      subject,
      html: status === 'completed' ? `
<link href="https://fonts.googleapis.com/css2?family=Anek+Telugu:wght@400;700&family=Luckiest+Guy&display=swap" rel="stylesheet">
<link href="https://fonts.cdnfonts.com/css/cooper-black" rel="stylesheet">
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
  <div style="background-color: white; padding: 25px 30px; text-align: center;">
    <img src="https://firebasestorage.googleapis.com/v0/b/may-i-help-you-foundation.firebasestorage.app/o/logo.png?alt=media&token=9ac09ac5-4c97-418c-b070-2495eac88291" alt="May I Help You Foundation Logo" style="width: 120px; height: auto; margin-bottom: 10px; border-radius: 50%;">
    <h1 style="font-family: 'Cooper Black', serif; color: #D81B60; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px;">May I Help You Foundation</h1>
  </div>
  <div style="padding: 40px; color: #333; line-height: 1.6;">
    <h2 style="color: #D81B60; margin-top: 0;"><span style="font-family: luckiest guy, anek telugu, sans-serif">ధన్యవాదాలు </span>(Thank You), ${donation.donorName || 'Supporter'}!</h2>
    <p style="font-size: 16px; font-family: luckiest guy, anek telugu, sans-serif">మీ ఉదారతకు మేము కృతజ్ఞతలు తెలుపుకుంటున్నాము.</p>
    <p style="font-size: 16px;">We have successfully received your generous contribution of:</p>
    <div style="background-color: #fce4ec; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #D81B60;">${donation.currency} ${donation.amount}</span>
    </div>
    <div style="font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 20px;">
      <p><strong>Transaction ID:</strong> ${donation.transactionId}</p>
    </div>
    <p style="margin-top: 30px; font-size: 16px;">Your support helps us empower the underprivileged through sustainable initiatives in education and healthcare.</p>
    <br>
    <p style="margin: 0; font-weight: bold;">Best Regards,</p>
    <p style="margin: 5px 0; color: #D81B60; font-weight: bold;">Team May I Help You Foundation</p>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
    <p>This is an automated receipt for your donation. Thank you for making a difference!</p>
  </div>
</div>
      ` : `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eee; border-radius: 12px; background: #fff;">
          <h2 style="color: #D81B60;">${subject}</h2>
          <p>Hello ${donation.donorName || 'Supporter'},</p>
          <p style="font-size: 16px; color: #333;">We were unable to complete your payment for the donation at this time.</p>
          <p style="font-size: 16px; color: #333;"><strong>Transaction ID:</strong> ${donation.transactionId}</p>
          <p style="font-size: 16px; color: #333;"><strong>Amount:</strong> ${donation.currency} ${donation.amount}</p>
          <p style="font-size: 16px; color: #333;">Please try again or contact support if you need assistance.</p>
          <br />
          <p style="font-weight: bold;">Best Regards,</p>
          <p style="color: #D81B60; font-weight: bold;">Team May I Help You Foundation</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending payment status email:', error);
  }
};

const updateDonationPaymentStatus = async (orderId) => {
  const donation = await Donation.findOne({ where: { transactionId: orderId } });
  if (!donation || donation.paymentStatus !== 'pending') return donation;

  try {
    const order = await razorpay.orders.fetch(orderId);
    let newStatus = donation.paymentStatus;

    if (order.status === 'paid') {
      newStatus = 'completed';
    } else if (order.status === 'created' && order.attempts === 0) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (new Date(donation.createdAt) < fifteenMinutesAgo) {
        newStatus = 'Cancelled';
      }
    } else {
      const payments = await razorpay.orders.fetchPayments(orderId);
      const items = payments.items || [];
      if(payments.count > 0) {
        
      // Check payment items if the order status isn't definitively 'paid'
      if (items.some(p => ['captured', 'authorized'].includes(p.status))) {
        newStatus = 'completed';
      } else if (items.some(p => ['failed', 'cancelled'].includes(p.status))) {
        newStatus = 'failed';
      }
      }

    }

    if (newStatus !== donation.paymentStatus) {
      donation.paymentStatus = newStatus;
      await donation.save();

      // Update or create donor when payment is completed
      if (newStatus === 'completed' && donation.phone) {
        try {
          const normalizedEmail = donation.email ? donation.email.trim().toLowerCase() : null;
          const existingDonor = await Donor.findOne({ where: { phone: donation.phone } });
          const donorData = {
            name: donation.donorName,
            email: normalizedEmail,
            city: donation.city,
            isBloodDonor: donation.isBloodDonor,
            bloodGroup: donation.bloodGroup
          };

          if (existingDonor) {
            await existingDonor.update(donorData);
            console.log(`Donor updated on payment completion: ${donation.phone}`);
          } else if (normalizedEmail) {
            await Donor.create({
              ...donorData,
              phone: donation.phone
            });
            console.log(`New donor created on payment completion: ${donation.phone}`);
          }
        } catch (error) {
          console.error('Error updating/creating donor on payment completion:', error);
        }
      }
    }
  } catch (error) {
    console.error(`Error updating payment status for order ${orderId}:`, error);
  }

  return donation;
};

exports.createCustomSubscription = async (req, res) => {
  try {
    // 1. Get the custom amount entered by the donor from the Angular request
    console.log(req.body)
    const { donorName, email, phone, city, amount, currency, message, transactionId, paymentStatus, isBloodDonor, bloodGroup } = req.body; // e.g., 350
    // console.log(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);
    // Razorpay accepts amounts in PAISE (Multiply INR by 100)
    const amountInPaise = amount * 100; 

    // 2. Step One: Create a brand new, dynamic plan for this exact amount
    const planOptions = {
      period: 'monthly',
      interval: 1,
      item: {
        name: `Custom Monthly Donation Plan - ₹${amount}`,
        amount: amountInPaise,
        currency: 'INR',
        description: 'Dynamically generated recurring donation tier'
      }
    };
    // console.log('Creating dynamic plan with options:', planOptions);
    const dynamicPlan = await razorpay.plans.create(planOptions);
    // console.log('Dynamic plan created:', dynamicPlan);
    // 3. Step Two: Instantly use the newly generated plan.id to create the subscription
    const subscriptionOptions = {
      plan_id: dynamicPlan.id, // The dynamic plan ID from step 2
      total_count: 12,        // 12 months
      quantity: 1,
      customer_notify: 1
    };
    // console.log('Creating subscription with options:', subscriptionOptions);
    const subscription = await razorpay.subscriptions.create(subscriptionOptions);
    // console.log('Subscription created:', subscription);
    const newDonation = await Donation.create({
      donorName,
      email,
      phone,
      city,
      amount,
      currency,
      message,
      transactionId: subscription.id, // Save Razorpay Order ID
      paymentStatus: 'pending',
      isBloodDonor,
      bloodGroup
    });

    // 4. Send the subscription ID back to Angular to trigger the rzp.open() checkout modal
    res.status(200).json({
      success: true,
      donation: newDonation,
      subscription_id: subscription.id
    });

  } catch (error) {
    console.error('Error creating custom subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.verifyCustomDonation = async (req, res) => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return res.status(400).json({ valid: false, message: 'Missing required payment details.' });
  }

  try {
    // 1. Verify the signature from Razorpay
    const secret = process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ valid: false, message: 'Signature verification failed. Request is not from a trusted source.' });
    }

    // 2. Signature is valid, now find the corresponding donation record
    const donation = await Donation.findOne({ where: { transactionId: razorpay_subscription_id } });
    if (!donation) {
      return res.status(404).json({ valid: false, message: 'Donation record not found for this subscription.' });
    }

    // 3. Start polling for the subscription status and wait for it to complete.
    const finalStatus = await pollSubscriptionStatus(razorpay_subscription_id, donation);

    // 4. Respond to the client with the final status from the polling.
    if (finalStatus.status === 'completed') {
      res.status(200).json({ valid: true, status: 'completed', message: finalStatus.message });
    } else {
      res.status(400).json({ valid: false, status: finalStatus.status, message: finalStatus.message });
    }

  } catch (error) {
    console.error('Error in verifyCustomDonation:', error);
    res.status(500).json({ valid: false, message: 'An internal server error occurred during verification.' });
  }
};

const pollSubscriptionStatus = (subscriptionId, donation, maxDurationMs = 10 * 60 * 1000, intervalMs = 3000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`[${subscriptionId}] Starting to poll for subscription status.`);

    const poll = async () => {
      if (Date.now() - startTime > maxDurationMs) {
        console.log(`[${subscriptionId}] Polling timed out after 10 minutes. Stopping.`);
        resolve({ status: 'timed_out', message: 'Subscription status check timed out after 10 minutes.' });
        return;
      }

      try {
        const subscription = await razorpay.subscriptions.fetch(subscriptionId);
        console.log(`[${subscriptionId}] Polled status: ${subscription.status}`);

        if (['active', 'completed'].includes(subscription.status)) {
          if (donation.paymentStatus !== 'completed') {
            donation.paymentStatus = 'completed';
            await donation.save();
            await sendThankYouEmail(donation);
            console.log(`[${subscriptionId}] Status is '${subscription.status}'. Updated DB to 'completed' and sent email.`);
          }
          // Resolve the promise to stop polling and send response to client
          resolve({ status: 'completed', message: 'Subscription activated successfully.' });
          return;
        } else if (['halted', 'cancelled', 'expired'].includes(subscription.status)) {
          if (donation.paymentStatus !== 'failed') {
            donation.paymentStatus = 'failed';
            await donation.save();
            await sendPaymentStatusEmail(donation, 'failed');
            console.log(`[${subscriptionId}] Status is '${subscription.status}'. Updated DB to 'failed' and sent email.`);
          }
          // Resolve the promise on failure states to stop polling
          resolve({ status: 'failed', message: `Subscription is in a failed state: ${subscription.status}.` });
          return;
        }
      } catch (error) {
        console.error(`[${subscriptionId}] Error during polling:`, error);
      }

      // If not a final state, poll again after the interval
      setTimeout(poll, intervalMs);
    };

    poll();
  });
};

const schedulePaymentStatusCheck = (orderId, delayMs = 3 * 60 * 1000) => {
  setTimeout(async () => {
    try {
      await updateDonationPaymentStatus(orderId);
    } catch (error) {
      console.error(`Error checking payment status for order ${orderId}:`, error);
    }
  }, delayMs);
};

exports.webhookUpdate = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET';
  const receivedSignature = req.headers['x-razorpay-signature'];

  // It's crucial to validate the webhook signature to ensure it's from Razorpay
  try {
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (generatedSignature !== receivedSignature) {
      console.warn('Webhook signature validation failed.');
      // For security, don't process unverified webhooks
      return res.status(400).send('Invalid signature');
    }
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return res.status(500).send('Error validating signature');
  }

  const eventData = req.body;

  if (eventData.event === 'subscription.charged') {
    try {
      const subscriptionDetails = eventData.payload.subscription.entity;
      const paymentDetails = eventData.payload.payment.entity;

      // Find the original donation to get donor details
      const originalDonation = await Donation.findOne({
        where: { transactionId: subscriptionDetails.id },
        order: [['createdAt', 'ASC']]
      });

      if (originalDonation) {
        // Create a new donation record for this recurring payment
        const recurringDonation = await Donation.create({
          donorName: originalDonation.donorName,
          email: originalDonation.email,
          phone: originalDonation.phone,
          city: originalDonation.city,
          amount: paymentDetails.amount / 100, // Convert from paise
          currency: paymentDetails.currency,
          message: `Recurring donation from subscription ${subscriptionDetails.id}`,
          transactionId: paymentDetails.id, // Use the new payment ID
          paymentStatus: 'completed',
        });
        console.log(`Recurring donation recorded: ${recurringDonation.id} for payment ${paymentDetails.id}`);
        await sendThankYouEmail(recurringDonation);
      }
    } catch (error) {
      console.error('Error processing subscription.charged webhook:', error);
    }
  }

  res.status(200).send('Webhook Acknowledged');
};

exports.updateDonationPaymentStatus = updateDonationPaymentStatus;