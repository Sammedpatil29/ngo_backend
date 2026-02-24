const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

router.post('/', donationController.createDonation);
router.get('/', donationController.getAllDonations);
router.get('/phone/:phone', donationController.getDonationByPhone);

module.exports = router;