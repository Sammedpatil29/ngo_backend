const Volunteer = require('../models/volunteerModel');
const admin = require('firebase-admin');

let serviceAccount;
try {
  serviceAccount = require('../may-i-help-you-foundation-firebase-adminsdk-fbsvc-70cfe5cb12.json');
} catch (e) {
  // Service account not found, falling back to default credentials
}

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
    storageBucket: 'may-i-help-you-foundation.firebasestorage.app'
  });
}

// Create a new volunteer
exports.createVolunteer = async (req, res) => {
  try {
    const volunteer = await Volunteer.create(req.body);
    res.status(201).json(volunteer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all volunteers
exports.getAllVolunteers = async (req, res) => {
  try {
    const volunteers = await Volunteer.findAll();
    res.status(200).json(volunteers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get active volunteers
exports.getActiveVolunteers = async (req, res) => {
  try {
    const volunteers = await Volunteer.findAll({ where: { isActive: true } });
    res.status(200).json(volunteers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single volunteer by ID
exports.getVolunteerById = async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id);
    if (!volunteer) return res.status(404).json({ message: 'Volunteer not found' });
    res.status(200).json(volunteer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a volunteer
exports.updateVolunteer = async (req, res) => {
  try {
    const [updated] = await Volunteer.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedVolunteer = await Volunteer.findByPk(req.params.id);
      res.status(200).json(updatedVolunteer);
    } else {
      res.status(404).json({ message: 'Volunteer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a volunteer
exports.deleteVolunteer = async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id);

    if (volunteer) {
      // Delete image from Firebase Storage
      if (volunteer.image) {
        try {
          const bucket = admin.storage().bucket();
          const filename = volunteer.image.split('/').pop();
          if (filename) {
            await bucket.file(filename).delete();
          }
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
      await volunteer.destroy();
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Volunteer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};