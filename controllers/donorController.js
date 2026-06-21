const Donor = require('../models/donor');
const nodemailer = require('nodemailer');

// Create a new donor
exports.createDonor = async (req, res) => {
  try {
    const { name, email, phone, city, isBloodDonor, bloodGroup } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

    const [donor, created] = await Donor.findOrCreate({
      where: { email },
      defaults: { name, phone, city, isBloodDonor, bloodGroup }
    });

    if (!created) {
      // update existing record with provided fields
      await donor.update({ name, phone, city, isBloodDonor, bloodGroup });
    } else {
      await sendDonorRegistrationEmail(donor);
    }

    res.status(created ? 201 : 200).json(donor);
  } catch (error) {
    console.error('Error creating donor:', error);
    res.status(500).json({ error: 'Failed to create donor', details: error.message });
  }
};

// Get all donors
exports.getAllDonors = async (req, res) => {
  try {
    const donors = await Donor.findAll({ order: [['createdAt', 'DESC']] });
    res.json(donors);
  } catch (error) {
    console.error('Error fetching donors:', error);
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
};

// Get donor by id
exports.getDonorById = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findByPk(id);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json(donor);
  } catch (error) {
    console.error('Error fetching donor:', error);
    res.status(500).json({ error: 'Failed to fetch donor' });
  }
};

// Update donor
exports.updateDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findByPk(id);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const { name, email, phone, city, isBloodDonor, bloodGroup } = req.body;
    await donor.update({ name, email, phone, city, isBloodDonor, bloodGroup });
    res.json(donor);
  } catch (error) {
    console.error('Error updating donor:', error);
    res.status(500).json({ error: 'Failed to update donor', details: error.message });
  }
};

// Delete donor
exports.deleteDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findByPk(id);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    await donor.destroy();
    res.json({ message: 'Donor deleted' });
  } catch (error) {
    console.error('Error deleting donor:', error);
    res.status(500).json({ error: 'Failed to delete donor' });
  }
};

// Find donor by phone
exports.getDonorByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const donor = await Donor.findOne({ where: { phone } });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json(donor);
  } catch (error) {
    console.error('Error fetching donor by phone:', error);
    res.status(500).json({ error: 'Failed to fetch donor', details: error.message });
  }
};

const sendDonorRegistrationEmail = async (donor) => {
  if (!donor || !donor.email) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'sammed.patil29@gmail.com',
      pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || 'dxjw yrxh vpox ndtx'
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'sammed.patil29@gmail.com',
    to: donor.email,
    subject: `Thank you for registering with May I Help You Foundation`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; background: #ffffff;">
        <h1 style="color: #D81B60;">Thank you for registering!</h1>
        <p style="font-size: 16px; color: #333;">Hello ${donor.name || 'Friend'},</p>
        <p style="font-size: 16px; color: #333;">Thank you for registering with May I Help You Foundation. We appreciate your support and look forward to staying connected.</p>
        <p style="font-size: 16px; color: #333;"><strong>Your details:</strong></p>
        <ul style="font-size: 16px; color: #333;">
          <li>Name: ${donor.name || 'N/A'}</li>
          <li>Email: ${donor.email}</li>
          ${donor.phone ? `<li>Phone: ${donor.phone}</li>` : ''}
          ${donor.city ? `<li>City: ${donor.city}</li>` : ''}
          ${donor.bloodGroup ? `<li>Blood Group: ${donor.bloodGroup}</li>` : ''}
        </ul>
        <p style="font-size: 16px; color: #333;">If you have any questions, feel free to reply to this email.</p>
        <p style="font-size: 16px; color: #333;">Warm regards,<br/>Team May I Help You Foundation</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Donor registration email sent to ${donor.email}`);
  } catch (error) {
    console.error(`Failed to send registration email to ${donor.email}:`, error);
  }
};
