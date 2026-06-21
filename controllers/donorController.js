const Donor = require('../models/donor');

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
