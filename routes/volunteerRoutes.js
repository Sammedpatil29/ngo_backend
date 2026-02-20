const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');

router.post('/', volunteerController.createVolunteer);
router.get('/', volunteerController.getAllVolunteers);
router.get('/:id', volunteerController.getVolunteerById);
router.put('/:id', volunteerController.updateVolunteer);
router.delete('/:id', volunteerController.deleteVolunteer);

module.exports = router;