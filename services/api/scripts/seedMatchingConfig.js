const MatchingConfig = require('../models/MatchingConfig');

async function seedMatchingConfig() {
  const existing = await MatchingConfig.findOne({ key: 'active' });
  if (existing) {
    console.log('[seed] matching config already exists, skipping');
    return existing;
  }

  const doc = await MatchingConfig.create({
    key: 'active',
    version: 1,
    pickupMaxDistance: 99999999,
    totalMaxDistance: 99999999,
  });

  console.log('[seed] matching config created');
  return doc;
}

module.exports = seedMatchingConfig;

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  const { database } = require('../config/index');

  mongoose.connect(database.url, database.options)
    .then(seedMatchingConfig)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}