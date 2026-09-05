const Donation = require('../models/donation');
const Donor = require('../models/donor');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre'
  });
};

const getEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'sammed.patil29@gmail.com',
      pass: process.env.EMAIL_PASS || 'dxjw yrxh vpox ndtx'
    }
  });
};

// Helper to upsert donor info upon successful payment
const upsertDonorFromDonation = async (donation) => {
  if (!donation || !donation.phone) return;
  try {
    const normalizedEmail = donation.email ? donation.email.trim().toLowerCase() : null;
    const existingDonor = await Donor.findOne({ where: { phone: donation.phone } });
    const donorData = {
      name: donation.donorName,
      email: normalizedEmail,
      city: donation.city,
      isBloodDonor: !!donation.isBloodDonor,
      bloodGroup: donation.bloodGroup || null
    };

    if (existingDonor) {
      await existingDonor.update(donorData);
      console.log(`Donor updated on payment success: ${donation.phone}`);
    } else if (normalizedEmail) {
      await Donor.create({
        ...donorData,
        phone: donation.phone
      });
      console.log(`New donor created on payment success: ${donation.phone}`);
    }
  } catch (error) {
    console.error('Error syncing donor record:', error);
  }
};

// POST /api/donations - Create a new one-time donation order
exports.createDonation = async (req, res) => {
  try {
    const { donorName, email, phone, city, amount, currency, message, isBloodDonor, bloodGroup } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid donation amount is required' });
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(parsedAmount * 100);
    const selectedCurrency = currency || 'INR';

    const orderOptions = {
      amount: amountInPaise,
      currency: selectedCurrency,
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    const order = await razorpay.orders.create(orderOptions);

    const newDonation = await Donation.create({
      donorName: donorName || 'Anonymous Supporter',
      email,
      phone,
      city,
      amount: parsedAmount,
      currency: selectedCurrency,
      message,
      transactionId: order.id,
      paymentStatus: 'pending',
      isBloodDonor: !!isBloodDonor,
      bloodGroup: bloodGroup || null
    });

    // Auto-check fallback status after 5 minutes in background
    schedulePaymentStatusCheck(order.id, 5 * 60 * 1000);

    return res.status(201).json({
      message: 'Donation order created successfully',
      donation: newDonation,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs'
    });
  } catch (error) {
    console.error('Error creating donation order:', error);
    return res.status(500).json({ error: 'Failed to initiate donation', details: error.message });
  }
};

// POST /api/donations/verify - Verify payment HMAC signature
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ status: 'failure', message: 'Missing required payment verification parameters' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;
    const donation = await Donation.findOne({ where: { transactionId: razorpay_order_id } });

    if (!donation) {
      return res.status(404).json({ status: 'failure', message: 'Donation record not found for this order' });
    }

    if (isAuthentic) {
      const razorpay = getRazorpayInstance();
      try {
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status === 'authorized') {
          await razorpay.payments.capture(razorpay_payment_id, Math.round(donation.amount * 100), donation.currency || 'INR');
        }
      } catch (captureErr) {
        console.warn('Payment capture note/warning:', captureErr.message);
      }

      if (donation.paymentStatus !== 'completed') {
        donation.paymentStatus = 'completed';
        donation.transactionId = razorpay_payment_id; // Update to actual payment ID for receipt
        await donation.save();

        await upsertDonorFromDonation(donation);
        sendThankYouEmail(donation).catch(err => console.error('Email send failed:', err));
      }

      return res.status(200).json({
        status: 'success',
        message: 'Payment verified and donation completed successfully'
      });
    } else {
      donation.paymentStatus = 'failed';
      await donation.save();

      sendPaymentStatusEmail(donation, 'failed').catch(err => console.error('Email send failed:', err));
      return res.status(400).json({ status: 'failure', message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ status: 'failure', message: 'Payment verification failed', details: error.message });
  }
};

// GET /api/donations - Get all donations and live Razorpay stats
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.findAll({ order: [['createdAt', 'DESC']] });
    const razorpay = getRazorpayInstance();

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

    const [todayPayments, weekPayments, monthPayments, yearPayments, allSubscriptions, allPlans, balanceResponse] = await Promise.all([
      razorpay.payments.all({ from: todayFromTimestamp, to: toTimestamp, count: 100 }).catch(() => ({ items: [] })),
      razorpay.payments.all({ from: weekFromTimestamp, to: toTimestamp, count: 100 }).catch(() => ({ items: [] })),
      razorpay.payments.all({ from: monthFromTimestamp, to: toTimestamp, count: 100 }).catch(() => ({ items: [] })),
      razorpay.payments.all({ from: yearFromTimestamp, to: toTimestamp, count: 100 }).catch(() => ({ items: [] })),
      razorpay.subscriptions.all().catch(() => ({ items: [] })),
      razorpay.plans.all().catch(() => ({ items: [] })),
      axios.get('https://api.razorpay.com/v1/balance', {
        auth: {
          username: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs',
          password: process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre'
        }
      }).catch(() => ({ data: { balance: 0 } }))
    ]);

    const calculateTotal = (payments) => {
      if (!payments || !payments.items) return 0;
      return payments.items
        .filter(p => p.status === 'captured')
        .reduce((sum, p) => sum + p.amount, 0) / 100;
    };

    const planAmountMap = new Map();
    if (allPlans && allPlans.items) {
      allPlans.items.forEach(plan => {
        planAmountMap.set(plan.id, plan.item.amount);
      });
    }

    const activeSubscriptions = allSubscriptions && allSubscriptions.items
      ? allSubscriptions.items.filter(sub => sub.status === 'active')
      : [];
    const activeSubscriptionsCount = activeSubscriptions.length;
    const activeSubscriptionsTotal = activeSubscriptions
      .reduce((sum, sub) => sum + (planAmountMap.get(sub.plan_id) || 0), 0) / 100;

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
      },
      balance: (balanceResponse.data.balance || 0) / 100
    };

    res.json({ donations, razorpayStats });
  } catch (error) {
    console.error('Error fetching donations and stats:', error);
    res.status(500).json({ error: 'Failed to fetch donations and stats', details: error.message });
  }
};

// GET /api/donations/phone/:phone - Get donor details by phone number
exports.getDonationByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const donor = await Donor.findOne({
      where: { phone: phone },
      order: [['createdAt', 'DESC']]
    });

    if (!donor) {
      return res.status(404).json({ message: 'No donor found with that phone number.' });
    }

    res.status(200).json({
      donorName: donor.name,
      email: donor.email,
      city: donor.city,
      isBloodDonor: donor.isBloodDonor,
      bloodGroup: donor.bloodGroup
    });
  } catch (error) {
    console.error('Error fetching donor by phone:', error);
    res.status(500).json({ error: 'Failed to fetch donor data', details: error.message });
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

// GET /api/donations/status/:orderId - Check status of an order
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const donation = await Donation.findOne({ where: { transactionId: orderId } });

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

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

// POST /api/donations/subscribe-custom - Create recurring subscription plan & session
exports.createCustomSubscription = async (req, res) => {
  try {
    const { donorName, email, phone, city, amount, currency, message, isBloodDonor, bloodGroup } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid donation amount is required' });
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(parsedAmount * 100);

    const planOptions = {
      period: 'monthly',
      interval: 1,
      item: {
        name: `Monthly Donation - ₹${parsedAmount}`,
        amount: amountInPaise,
        currency: currency || 'INR',
        description: 'Monthly Recurring Donation to May I Help You Foundation'
      }
    };

    const dynamicPlan = await razorpay.plans.create(planOptions);

    const subscriptionOptions = {
      plan_id: dynamicPlan.id,
      total_count: 12,
      quantity: 1,
      customer_notify: 1
    };

    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    const newDonation = await Donation.create({
      donorName: donorName || 'Anonymous Supporter',
      email,
      phone,
      city,
      amount: parsedAmount,
      currency: currency || 'INR',
      message,
      transactionId: subscription.id,
      paymentStatus: 'pending',
      isBloodDonor: !!isBloodDonor,
      bloodGroup: bloodGroup || null
    });

    res.status(200).json({
      success: true,
      donation: newDonation,
      subscription_id: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs'
    });
  } catch (error) {
    console.error('Error creating custom subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/donations/verify-subscription - Verify recurring subscription signature
exports.verifyCustomDonation = async (req, res) => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return res.status(400).json({ valid: false, message: 'Missing required payment verification details' });
  }

  try {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ valid: false, message: 'Signature verification failed. Untrusted source.' });
    }

    const donation = await Donation.findOne({ where: { transactionId: razorpay_subscription_id } });
    if (!donation) {
      return res.status(404).json({ valid: false, message: 'Donation record not found for this subscription.' });
    }

    if (donation.paymentStatus !== 'completed') {
      donation.paymentStatus = 'completed';
      donation.transactionId = razorpay_payment_id;
      await donation.save();

      await upsertDonorFromDonation(donation);
      sendThankYouEmail(donation).catch(err => console.error('Email send failed:', err));
    }

    return res.status(200).json({
      valid: true,
      status: 'completed',
      message: 'Monthly subscription activated successfully.'
    });
  } catch (error) {
    console.error('Error in verifyCustomDonation:', error);
    res.status(500).json({ valid: false, message: 'Internal server error during verification.' });
  }
};

// Webhook for Razorpay asynchronous lifecycle events (e.g. subscription renewals)
exports.webhookUpdate = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const receivedSignature = req.headers['x-razorpay-signature'];

  if (webhookSecret && receivedSignature) {
    try {
      const generatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (generatedSignature !== receivedSignature) {
        console.warn('Webhook signature validation failed.');
        return res.status(400).send('Invalid webhook signature');
      }
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return res.status(500).send('Webhook validation error');
    }
  }

  const eventData = req.body;
  if (eventData && eventData.event === 'subscription.charged') {
    try {
      if (eventData.payload && eventData.payload.subscription && eventData.payload.payment) {
        const subscriptionDetails = eventData.payload.subscription.entity;
        const paymentDetails = eventData.payload.payment.entity;

        const subscriptionCreationTime = subscriptionDetails.created_at * 1000;
        const timeDifferenceInHours = (Date.now() - subscriptionCreationTime) / (1000 * 60 * 60);

        // Skip duplicate initial charge if processed within 24h by direct verification
        if (timeDifferenceInHours < 24) {
          console.log(`[Webhook] Initial charge for subscription ${subscriptionDetails.id} acknowledged.`);
          return res.status(200).send('Webhook Acknowledged - Initial charge.');
        }

        const originalDonation = await Donation.findOne({
          where: { transactionId: subscriptionDetails.id },
          order: [['createdAt', 'ASC']]
        });

        if (originalDonation) {
          const recurringDonation = await Donation.create({
            donorName: originalDonation.donorName,
            email: originalDonation.email,
            phone: originalDonation.phone,
            city: originalDonation.city,
            amount: paymentDetails.amount / 100,
            currency: paymentDetails.currency,
            message: `Monthly recurring donation for subscription ${subscriptionDetails.id}`,
            transactionId: paymentDetails.id, // Save unique payment ID
            paymentStatus: 'completed'
          });

          console.log(`Recurring donation recorded: ${recurringDonation.id} for payment ${paymentDetails.id}`);
          sendThankYouEmail(recurringDonation).catch(err => console.error('Email send failed:', err));
        }
      }
    } catch (error) {
      console.error('Error processing subscription.charged webhook:', error);
    }
  }

  return res.status(200).send('Webhook Acknowledged');
};

// Helper: send thank you email
const sendThankYouEmail = async (donation) => {
  if (!donation || !donation.email) return;
  try {
    const transporter = getEmailTransporter();
    const mailOptions = {
      from: `"May I Help You Foundation" <${process.env.EMAIL_USER || 'mayihelpyoufoundationjmd@gmail.com'}>`,
      to: donation.email,
      subject: `Thank You for Your Donation - ${donation.transactionId}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="background-color: white; padding: 25px 30px; text-align: center;">
            <img src="https://firebasestorage.googleapis.com/v0/b/may-i-help-you-foundation.firebasestorage.app/o/logo.png?alt=media&token=9ac09ac5-4c97-418c-b070-2495eac88291" alt="Logo" style="width: 100px; height: auto; margin-bottom: 10px; border-radius: 50%;">
            <h1 style="color: #D81B60; margin: 0; font-size: 24px; text-transform: uppercase;">May I Help You Foundation</h1>
          </div>
          <div style="padding: 30px; color: #333; line-height: 1.6;">
            <h2 style="color: #D81B60; margin-top: 0;">Thank You, ${donation.donorName || 'Generous Donor'}!</h2>
            <p style="font-size: 16px;">We have successfully received your generous contribution of:</p>
            <div style="background-color: #fce4ec; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; color: #D81B60;">${donation.currency || 'INR'} ₹${donation.amount}</span>
            </div>
            <p><strong>Transaction / Payment ID:</strong> ${donation.transactionId}</p>
            <p>Your support helps us empower the underprivileged through education and healthcare initiatives.</p>
            <br>
            <p style="margin: 0; font-weight: bold;">Warm Regards,</p>
            <p style="margin: 5px 0; color: #D81B60; font-weight: bold;">Team May I Help You Foundation</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Thank-you email successfully sent to ${donation.email}`);
  } catch (error) {
    console.error('Error sending thank you email:', error.message);
  }
};

// Helper: send payment status email
const sendPaymentStatusEmail = async (donation, status) => {
  if (!donation || !donation.email) return;
  try {
    const transporter = getEmailTransporter();
    const isSuccess = status === 'completed';
    const subject = isSuccess
      ? `Thank You for Your Donation - ${donation.transactionId}`
      : `Donation Payment Update - ${donation.transactionId}`;

    const mailOptions = {
      from: `"May I Help You Foundation" <${process.env.EMAIL_USER || 'mayihelpyoufoundationjmd@gmail.com'}>`,
      to: donation.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eee; border-radius: 12px; background: #fff;">
          <h2 style="color: #D81B60;">${subject}</h2>
          <p>Hello ${donation.donorName || 'Supporter'},</p>
          <p>${isSuccess ? 'Your donation was successful!' : 'We were unable to complete your payment at this time.'}</p>
          <p><strong>Transaction ID:</strong> ${donation.transactionId}</p>
          <p><strong>Amount:</strong> ₹${donation.amount}</p>
          <br />
          <p>Best Regards,</p>
          <p style="color: #D81B60; font-weight: bold;">Team May I Help You Foundation</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending payment status email:', error.message);
  }
};

// Helper: update pending donation status from Razorpay
const updateDonationPaymentStatus = async (orderId) => {
  const donation = await Donation.findOne({ where: { transactionId: orderId } });
  if (!donation || donation.paymentStatus !== 'pending') return donation;

  try {
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.fetch(orderId);
    let newStatus = donation.paymentStatus;

    if (order.status === 'paid') {
      newStatus = 'completed';
    } else if (order.status === 'created' && order.attempts === 0) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (new Date(donation.createdAt) < fifteenMinutesAgo) {
        newStatus = 'cancelled';
      }
    } else {
      const payments = await razorpay.orders.fetchPayments(orderId);
      const items = payments.items || [];
      if (payments.count > 0) {
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

      if (newStatus === 'completed') {
        await upsertDonorFromDonation(donation);
      }
    }
  } catch (error) {
    console.error(`Error updating payment status for order ${orderId}:`, error.message);
  }

  return donation;
};

const schedulePaymentStatusCheck = (orderId, delayMs = 3 * 60 * 1000) => {
  setTimeout(async () => {
    try {
      await updateDonationPaymentStatus(orderId);
    } catch (error) {
      console.error(`Error in scheduled payment check for order ${orderId}:`, error.message);
    }
  }, delayMs);
};

exports.updateDonationPaymentStatus = updateDonationPaymentStatus;