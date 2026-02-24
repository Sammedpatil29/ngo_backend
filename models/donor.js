const Sequelize = require('sequelize');
const sequelize = require('../database');

const Donor = sequelize.define('donor', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
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
  }
});

module.exports = Donor;