const express = require('express');
const router = express.Router();
const Donation = require('../models/donation');

// POST /api/donations - Create a new donation record
router.post('/', async (req, res) => {
  try {
    const { donorName, email, phone, amount, currency, message, transactionId, paymentStatus, isBloodDonor, bloodGroup } = req.body;
    
    const newDonation = await Donation.create({
      donorName,
      email,
      phone,
      amount,
      currency,
      message,
      transactionId,
      paymentStatus,
      isBloodDonor,
      bloodGroup
    });

    res.status(201).json({
      message: 'Donation recorded successfully',
      donation: newDonation
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({ error: 'Failed to process donation', details: error.message });
  }
});

// GET /api/donations - Get all donations
router.get('/', async (req, res) => {
  try {
    const donations = await Donation.findAll({ order: [['createdAt', 'DESC']] });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

module.exports = router;