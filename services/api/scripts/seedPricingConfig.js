const PricingConfig = require('../models/PricingConfig');

async function seedPricingConfig() {
  const existing = await PricingConfig.findOne({ key: 'active' });
  if (existing) {
    console.log('[seed] pricing config already exists, skipping');
    return existing;
  }

  const doc = await PricingConfig.create({
    key: 'active',
    version: 1,
    platformFeePercentage: 0.40,
    platformFeePercentagePedestrian: 0.30,
    paystackFeePercent: 0.01,
    paystackFeeCap: 300,
    pedestrianTiers: [
      { maxDistanceMeters: 500, fee: 1000 },
      { maxDistanceMeters: 1000, fee: 2000 },
    ],
    fleetRules: {
      bike: { baseFee: 1000, ratePerKm: 200 },
      cycling: { baseFee: 1000, ratePerKm: 200 },
      car: { baseFee: 1000, ratePerKm: 400 },
      van: { baseFee: 1000, ratePerKm: 400 },
      default: { baseFee: 1000, ratePerKm: 400 },
    },
  });

  console.log('[seed] pricing config created');
  return doc;
}

module.exports = seedPricingConfig;

// Standalone usage still works: node scripts/seedPricingConfig.js
if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  const { database } = require('../config/index');

  mongoose.connect(database.url, database.options)
    .then(seedPricingConfig)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}