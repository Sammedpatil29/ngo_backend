const Banner = require('../models/bannerModel');
const Service = require('../models/serviceModel');
const TeamMember = require('../models/teamMemberModel');
const News = require('../models/newsModel');
const Review = require('../models/reviewModel');
const admin = require('firebase-admin');

let serviceAccount;
try {
  // This file is used for local development, it should not be deployed.
  serviceAccount = require('../may-i-help-you-foundation-firebase-adminsdk-fbsvc-70cfe5cb12.json');
} catch (e) {
  console.warn("Warning: Could not load 'serviceAccountKey.json'. Ensure it is in the project root for local development.");
  // In production (Firebase), it will use default application credentials.
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
    storageBucket: 'may-i-help-you-foundation.firebasestorage.app'
  });
}

exports.getHomeData = async (req, res) => {
  try {
    const [banners, services, teamMembers, news, reviews] = await Promise.all([
      Banner.findAll({ where: { isActive: true } }),
      Service.findAll({ where: { isActive: true } }),
      TeamMember.findAll({ where: { isActive: true } }),
      News.findAll({ where: { isActive: true } }),
      Review.findAll({ where: { isActive: true } })
    ]);

    res.status(200).json({
      banners,
      services,
      teamMembers,
      news,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadImage = (req, res) => {
  try {
    let fileBuffer;
    let mimeType;
    let filename;

    if (req.file) {
      fileBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
      filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    } else if (req.body.image) {
      const matches = req.body.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).send({ message: 'Invalid base64 format' });
      }
      mimeType = matches[1];
      fileBuffer = Buffer.from(matches[2], 'base64');
      const ext = mimeType.split('/')[1];
      filename = `${Date.now()}-upload.${ext}`;
    } else {
      return res.status(400).send({ message: 'No file uploaded.' });
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(filename);

    const stream = file.createWriteStream({
      metadata: {
        contentType: mimeType,
      },
      resumable: false
    });

    stream.on('error', (err) => {
      console.error('Upload error:', err);
      res.status(500).send({ message: err.message });
    });

    stream.on('finish', async () => {
      try {
        // Make the file public so it can be accessed by the website
        await file.makePublic();
        
        // Construct the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        
        res.status(200).send({ data: publicUrl });
      } catch (error) {
        res.status(500).send({ message: 'Failed to generate public URL', error: error.message });
      }
    });

    stream.end(fileBuffer);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};