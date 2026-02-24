const Sequelize = require('sequelize');
const sequelize = require('../database');

const Donation = sequelize.define('donation', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  donorName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: Sequelize.STRING,
    allowNull: true
  },
  city: {
    type: Sequelize.STRING,
    allowNull: true
  },
  isBloodDonor: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  bloodGroup: {
    type: Sequelize.STRING,
    allowNull: true
  },
  amount: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: Sequelize.STRING,
    defaultValue: 'INR'
  },
  message: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  paymentStatus: {
    type: Sequelize.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  transactionId: {
    type: Sequelize.STRING,
    allowNull: true
  }
});

module.exports = Donation;