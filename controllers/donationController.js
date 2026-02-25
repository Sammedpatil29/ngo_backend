const Donation = require('../models/donation');
const Donor = require('../models/donor');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre'
});

// POST /api/donations - Create a new donation record
exports.createDonation = async (req, res) => {
  try {
    const { donorName, email, phone, city, amount, currency, message, transactionId, paymentStatus, isBloodDonor, bloodGroup } = req.body;

    if (phone) {
      try {
        const existingDonor = await Donor.findOne({ where: { phone } });
        const donorData = {
          name: donorName,
          email,
          city,
          isBloodDonor,
          bloodGroup
        };

        if (existingDonor) {
          await existingDonor.update(donorData);
        } else {
          await Donor.create({
            ...donorData,
            phone
          });
        }
      } catch (error) {
        console.error('Error updating/creating donor:', error);
        // Continue with donation creation even if donor logic fails
      }
    }

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

    // Start background polling to check payment status
    initiatePaymentPolling(order.id);

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
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donations' });
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
      donation.paymentStatus = 'completed';
      await donation.save();
      res.json({ status: 'success', message: 'Payment verified successfully' });
    } else {
      donation.paymentStatus = 'failed';
      await donation.save();
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
      const order = await razorpay.orders.fetch(orderId);
      if (order.status === 'paid') {
        donation.paymentStatus = 'completed';
        await donation.save();
      }
    }

    res.json({ status: donation.paymentStatus });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Failed to check status', details: error.message });
  }
};

// Helper function to poll payment status
const initiatePaymentPolling = (orderId) => {
  const pollInterval = 5000; // Check every 5 seconds
  const maxDuration = 15 * 60 * 1000; // Stop after 15 minutes
  const startTime = Date.now();

  const poll = async () => {
    try {
      // Stop if timeout reached
      if (Date.now() - startTime > maxDuration) return;

      const donation = await Donation.findOne({ where: { transactionId: orderId } });

      // If donation is already completed or failed (e.g. via webhook or verify endpoint), stop polling
      if (!donation || donation.paymentStatus === 'completed' || donation.paymentStatus === 'failed') {
        return;
      }

      const order = await razorpay.orders.fetch(orderId);

      if (order.status === 'paid') {
        await donation.update({ paymentStatus: 'completed' });
        return;
      }

      // Check for authorized payments and capture them
      const payments = await razorpay.orders.fetchPayments(orderId);
      const authorizedPayment = payments.items && payments.items.find(p => p.status === 'authorized');

      if (authorizedPayment) {
        await razorpay.payments.capture(authorizedPayment.id, Math.round(donation.amount * 100), donation.currency || 'INR');
        await donation.update({ paymentStatus: 'completed' });
        return;
      }

      // Continue polling
      setTimeout(poll, pollInterval);
    } catch (error) {
      console.error(`Error polling payment status for order ${orderId}:`, error);
    }
  };

  // Start the polling loop
  setTimeout(poll, pollInterval);
};