const Sequelize = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT || 'postgres',
  port: process.env.DB_PORT || 5432,
  dialectOptions: {
    ssl: false
  },
  logging: false
});

module.exports = sequelize;