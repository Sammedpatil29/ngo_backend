const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');

router.post('/', donorController.createDonor);
router.get('/', donorController.getAllDonors);
router.get('/phone/:phone', donorController.getDonorByPhone);
router.get('/:id', donorController.getDonorById);
router.put('/:id', donorController.updateDonor);
router.delete('/:id', donorController.deleteDonor);

module.exports = router;
