const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

router.post('/', donationController.createDonation);
router.get('/', donationController.getAllDonations);
router.get('/phone/:phone', donationController.getDonationByPhone);
router.post('/verify', donationController.verifyPayment);
router.get('/status/:orderId', donationController.checkPaymentStatus);

module.exports = router;