const Sequelize = require('sequelize');

const sequelize = new Sequelize('neondb', 'neondb_owner', 'npg_auSD4sHgpW3w', {
  host: 'ep-super-violet-a1vth0o7-pooler.ap-southeast-1.aws.neon.tech',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

module.exports = sequelize;