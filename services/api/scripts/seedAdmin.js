const User = require('../models/User');

async function seedAdmin() {
  const existing = await User.findOne({ email: process.env.SEED_ADMIN_EMAIL });
  if (existing) {
    console.log('[seed] admin already exists, skipping');
    return existing;
  }

  const doc = await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    role: 'super-admin',
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
  });

  console.log(`[seed] super-admin created: ${process.env.SEED_ADMIN_EMAIL}`);
  return doc;
}

module.exports = seedAdmin;

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  const { database } = require('../config/index');

  mongoose.connect(database.url, database.options)
    .then(seedAdmin)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}