require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const sequelize = require('./database');
const userRoutes = require('./routes/userRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const teamMemberRoutes = require('./routes/teamMemberRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const newsRoutes = require('./routes/newsRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const homeRoutes = require('./routes/homeRoutes');
const donationRoutes = require('./routes/donationRoutes');
const donorRoutes = require('./routes/donorRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
require('./cron/donationReminder');

// Set a global variable for the project root
global.appRoot = path.resolve(__dirname);

const app = express();
const PORT = process.env.PORT || 3000;
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON)
});

// Middleware
// app.use(cors({
//   origin: 'https://ngo-navy.vercel.app'
// }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from 'public' and 'images' directories
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));


// const allowedOrigin = 'https://ngo-navy.vercel.app';

// const originBlocker = (req, res, next) => {
//   const origin = req.headers.origin;

//   if (!origin) {
//     return res.status(403).json({ 
//       error: 'Forbidden', 
//       message: 'Direct API access or non-browser requests are not allowed.' 
//     });
//   }

//   if (origin !== allowedOrigin) {
//     return res.status(403).json({ 
//       error: 'Forbidden', 
//       message: 'Request not allowed from this origin.' 
//     });
//   }

//   next(); // Origin is valid, proceed to the route
// };

// app.use(originBlocker);

// Database Connection
// Routes
app.use('/api/users', userRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/team-members', teamMemberRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/reviews', reviewRoutes);

const ensureSchema = async () => {
  try {
    await sequelize.query(`ALTER TABLE IF EXISTS "donations" ADD COLUMN IF NOT EXISTS "subscriptionId" VARCHAR(255);`);
    await sequelize.query(`ALTER TABLE IF EXISTS "donations" ADD COLUMN IF NOT EXISTS "mode" VARCHAR(255) DEFAULT '1-time';`);
    console.log('Donation table schema verified/updated successfully.');
  } catch (schemaErr) {
    console.warn('Schema check warning:', schemaErr.message);
  }
};

sequelize
  .authenticate()
  .then(async () => {
    console.log('Database connected successfully.');
    await ensureSchema();
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log('Database startup error:', err));