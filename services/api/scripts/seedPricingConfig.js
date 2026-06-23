// Run once: node scripts/seedPricingConfig.js
require('dotenv').config();
const mongoose = require('mongoose');
const PricingConfig = require('../models/PricingConfig');
const { database } = require('../config/index');

async function seed() {
  await mongoose.connect(database.url, database.options);
  console.log('Connected to DB');

  const existing = await PricingConfig.findOne({ key: 'active' });
  if (existing) {
    console.log('Active pricing config already exists. Aborting seed to avoid overwriting live data.');
    console.log(existing);
    process.exit(0);
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

  console.log('✅ Seeded pricing config:', doc);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});