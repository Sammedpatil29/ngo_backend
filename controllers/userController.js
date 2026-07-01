const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const savedUser = await User.create(req.body);
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password, ipAddress, latitude, longitude } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Send login alert email asynchronously
    sendLoginAlertEmail({ email, ipAddress, latitude, longitude }).catch(err => {
      console.error('Failed to send login alert email:', err);
    });

    const token = jwt.sign({ id: user.id, email: user.email }, 'your_secret_key', { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendLoginAlertEmail = async (loginDetails) => {
  const { email, ipAddress, latitude, longitude } = loginDetails;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'sammed.patil29@gmail.com',
        pass: process.env.EMAIL_PASS || 'dxjw yrxh vpox ndtx'
      }
    });

    const mailOptions = {
      from: `"Login Alert from May I Help You Foundation" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Sending to admin
      subject: 'New User Login Alert',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #D81B60;">User Login Notification</h2>
          <p>A user has logged into the admin panel.</p>
          <h3>Details:</h3>
          <ul>
            <li><strong>User Email:</strong> ${email}</li>
            <li><strong>IP Address:</strong> ${ipAddress || 'Not provided'}</li>
            <li><strong>Location:</strong> ${latitude && longitude ? `${latitude}, ${longitude}` : 'Not provided'}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Login alert email sent for user: ${email}`);
  } catch (error) {
    console.error('Error sending login alert email:', error);
    // We don't re-throw here to avoid failing the login process
  }
};