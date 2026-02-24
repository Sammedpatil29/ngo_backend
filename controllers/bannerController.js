const Banner = require('../models/bannerModel');
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

// Create a new banner
exports.createBanner = async (req, res) => {
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json(banner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all banners
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.findAll();
    res.status(200).json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single banner by ID
exports.getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.status(200).json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a banner
exports.updateBanner = async (req, res) => {
  try {
    const [updated] = await Banner.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedBanner = await Banner.findByPk(req.params.id);
      res.status(200).json(updatedBanner);
    } else {
      res.status(404).json({ message: 'Banner not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a banner
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);

    if (banner) {
      // Delete image from Firebase Storage
      if (banner.image) {
        try {
          const bucket = admin.storage().bucket();
          const filename = banner.image.split('/').pop();
          if (filename) {
            await bucket.file(filename).delete();
          }
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
      await banner.destroy();
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Banner not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};