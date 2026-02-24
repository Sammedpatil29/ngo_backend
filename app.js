const express = require('express');
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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'https://ngo-navy.vercel.app'
}));
app.use(express.json({ limit: '50mb' }));

const allowedOrigin = 'https://ngo-navy.vercel.app';

const originBlocker = (req, res, next) => {
  const origin = req.headers.origin;

  // 1. Block if no origin is present (blocks default Postman/curl)
  if (!origin) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Direct API access or non-browser requests are not allowed.' 
    });
  }

  // 2. Block if the origin doesn't match your Vercel Frontend
  if (origin !== allowedOrigin) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Request not allowed from this origin.' 
    });
  }

  next(); // Origin is valid, proceed to the route
};

// Apply globally to all routes
app.use(originBlocker);

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

sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log(err));