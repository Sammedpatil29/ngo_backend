const Media = require('../models/mediaModel');

// Create new media
exports.createMedia = async (req, res) => {
  try {
    const media = await Media.create(req.body);
    res.status(201).json(media);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all media
exports.getAllMedia = async (req, res) => {
  try {
    const mediaList = await Media.findAll();
    res.status(200).json(mediaList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get media by ID
exports.getMediaById = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);
    if (!media) return res.status(404).json({ message: 'Media not found' });
    res.status(200).json(media);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update media
exports.updateMedia = async (req, res) => {
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

// Delete media
exports.deleteMedia = async (req, res) => {
  try {
    const deleted = await Media.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Media not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};