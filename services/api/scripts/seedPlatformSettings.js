const PlatformSettings = require('../models/PlatformSettings');

// called by utils/runSeed
async function seedPlatformSettings() {
  const existing = await PlatformSettings.findOne({ key: 'active' });
  if (existing) {
    console.log('[seed] platform settings already exists, skipping');
    return existing;
  }
  const doc = await PlatformSettings.create({
    key: 'active',
    platformBankAccount: '12345678901',
  });
  console.log('[seed] platform settings created');
  return doc;
}

module.exports = seedPlatformSettings;

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  const { database } = require('../config/index');

  mongoose.connect(database.url, database.options)
    .then(seedPlatformSettings)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}