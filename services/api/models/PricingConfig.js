const mongoose = require('mongoose');

const fleetRuleSchema = new mongoose.Schema({
  baseFee: { type: Number, required: true },
  ratePerKm: { type: Number, required: true },
}, { _id: false });

const pedestrianTierSchema = new mongoose.Schema({
  maxDistanceMeters: { type: Number, required: true },
  fee: { type: Number, required: true },
}, { _id: false });

const pricingConfigSchema = new mongoose.Schema({
  // Singleton doc — always look up by a fixed key, never by arbitrary _id
  key: { type: String, required: true, unique: true, default: 'active' },

  version: { type: Number, required: true, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

  platformFeePercentage: { type: Number, required: true, default: 0.40 },
  platformFeePercentagePedestrian: { type: Number, required: true, default: 0.30 },

  paystackFeePercent: { type: Number, required: true, default: 0.01 },
  paystackFeeCap: { type: Number, required: true, default: 300 },

  // Sorted ascending by maxDistanceMeters at write time — engine relies on this order
  pedestrianTiers: { type: [pedestrianTierSchema], required: true },

  fleetRules: {
    bike: { type: fleetRuleSchema, required: true },
    cycling: { type: fleetRuleSchema, required: true },
    car: { type: fleetRuleSchema, required: true },
    van: { type: fleetRuleSchema, required: true },
    default: { type: fleetRuleSchema, required: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('PricingConfig', pricingConfigSchema);