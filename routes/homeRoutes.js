const express = require('express');
const router = express.Router();
const multer = require('multer');
const homeController = require('../controllers/homeController');

// Configure multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.get('/', homeController.getHomeData);
router.post('/upload', upload.single('image'), homeController.uploadImage);

module.exports = router;