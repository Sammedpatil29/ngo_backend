const News = require('../models/newsModel');
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

// Create a new news item
exports.createNews = async (req, res) => {
  try {
    const newsItem = await News.create(req.body);
    res.status(201).json(newsItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all news items
exports.getAllNews = async (req, res) => {
  try {
    const news = await News.findAll();
    res.status(200).json(news);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single news item by ID
exports.getNewsById = async (req, res) => {
  try {
    const newsItem = await News.findByPk(req.params.id);
    if (!newsItem) return res.status(404).json({ message: 'News item not found' });
    res.status(200).json(newsItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a news item
exports.updateNews = async (req, res) => {
  try {
    const [updated] = await News.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedNews = await News.findByPk(req.params.id);
      res.status(200).json(updatedNews);
    } else {
      res.status(404).json({ message: 'News item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a news item
exports.deleteNews = async (req, res) => {
  try {
    const newsItem = await News.findByPk(req.params.id);

    if (newsItem) {
      // Delete image from Firebase Storage
      if (newsItem.image) {
        try {
          const bucket = admin.storage().bucket();
          const filename = newsItem.image.split('/').pop();
          if (filename) {
            await bucket.file(filename).delete();
          }
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
      await newsItem.destroy();
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'News item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};