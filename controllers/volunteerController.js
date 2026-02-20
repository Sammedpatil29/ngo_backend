const Volunteer = require('../models/volunteerModel');

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
    const deleted = await Volunteer.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Volunteer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};