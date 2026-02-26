const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

// Get Overall Structure
router.get('/', mediaController.getAllMedia);

// Category Routes
router.post('/category', mediaController.createCategory);
router.put('/category/:id', mediaController.updateCategory);
router.delete('/category/:id', mediaController.deleteCategory);

// Image Routes
router.post('/image', mediaController.createImage);
router.put('/image/:id', mediaController.updateImage);
router.delete('/image/:id', mediaController.deleteImage);

module.exports = router;