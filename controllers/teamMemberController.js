const TeamMember = require('../models/teamMemberModel');
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

// Create a new team member
exports.createTeamMember = async (req, res) => {
  try {
    const teamMember = await TeamMember.create(req.body);
    res.status(201).json(teamMember);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all team members
exports.getAllTeamMembers = async (req, res) => {
  try {
    const teamMembers = await TeamMember.findAll();
    res.status(200).json(teamMembers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single team member by ID
exports.getTeamMemberById = async (req, res) => {
  try {
    const teamMember = await TeamMember.findByPk(req.params.id);
    if (!teamMember) return res.status(404).json({ message: 'Team member not found' });
    res.status(200).json(teamMember);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a team member
exports.updateTeamMember = async (req, res) => {
  try {
    const [updated] = await TeamMember.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedTeamMember = await TeamMember.findByPk(req.params.id);
      res.status(200).json(updatedTeamMember);
    } else {
      res.status(404).json({ message: 'Team member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a team member
exports.deleteTeamMember = async (req, res) => {
  try {
    const teamMember = await TeamMember.findByPk(req.params.id);

    if (teamMember) {
      // Delete image from Firebase Storage
      if (teamMember.image) {
        try {
          const bucket = admin.storage().bucket();
          const filename = teamMember.image.split('/').pop();
          if (filename) {
            await bucket.file(filename).delete();
          }
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
      await teamMember.destroy();
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Team member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};