const Media = require('../models/mediaModel');
const MediaCategory = require('../models/mediaCategoryModel');
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

// Define Associations
MediaCategory.hasMany(Media, { foreignKey: 'categoryId', as: 'images' });
Media.belongsTo(MediaCategory, { foreignKey: 'categoryId' });

// --- GET OVERALL DATA ---

exports.getAllMedia = async (req, res) => {
  try {
    const mediaData = await MediaCategory.findAll({
      include: [{
        model: Media,
        as: 'images',
        required: false
      }]
    });
    res.status(200).json(mediaData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- CATEGORY CRUD ---

exports.createCategory = async (req, res) => {
  try {
    const category = await MediaCategory.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const [updated] = await MediaCategory.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedCategory = await MediaCategory.findByPk(req.params.id);
      res.status(200).json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    // Optional: Delete associated images first or rely on DB cascade
    await Media.destroy({ where: { categoryId: req.params.id } });
    const deleted = await MediaCategory.destroy({ where: { id: req.params.id } });
    
    if (deleted) {
      res.status(200).json({ message: 'Category deleted successfully' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- IMAGE (MEDIA) CRUD ---

exports.createImage = async (req, res) => {
  try {
    // Ensure categoryId is provided in req.body
    const media = await Media.create(req.body);
    res.status(201).json(media);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateImage = exports.updateMedia = async (req, res) => {
  try {
    const [updated] = await Media.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedMedia = await Media.findByPk(req.params.id);
      res.status(200).json(updatedMedia);
    } else {
      res.status(404).json({ message: 'Media not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteImage = exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);

    if (media) {
      // Delete image from Firebase Storage
      if (media.url) {
        try {
          const bucket = admin.storage().bucket();
          const filename = media.url.split('/').pop();
          if (filename) {
            await bucket.file(filename).delete();
          }
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
      await media.destroy();
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Media not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};