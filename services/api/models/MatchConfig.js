const mongoose = require('mongoose');

const matchingConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'active' },
  version: { type: Number, required: true, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

  pickupMaxDistance: { type: Number, required: true, min: 0, default: 99999999 },
  totalMaxDistance: { type: Number, required: true, min: 0, default: 99999999 },

  pedestrianMaxRunnerLeg: { type: Number, required: true, min: 0, default: 200 },
  pedestrianMaxDeliveryLeg: { type: Number, required: true, min: 0, default: 1000 },
  pedestrianTotalMax: { type: Number, required: true, min: 0, default: 1200 },
}, { timestamps: true });

module.exports = mongoose.model('MatchingConfig', matchingConfigSchema);