const Donation = require('../models/donation');
const Donor = require('../models/donor');

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

    const newDonation = await Donation.create({
      donorName,
      email,
      phone,
      city,
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
            donorName: donation.donorName,
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