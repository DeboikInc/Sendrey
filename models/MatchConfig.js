const mongoose = require('mongoose');

const matchingConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'active' },
  version: { type: Number, required: true, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

  // General
  pickupMaxDistance: { type: Number, required: true, min: 0 },
  totalMaxDistance: { type: Number, required: true, min: 0 },

  // Pedestrian-specific
  pedestrianMaxRunnerLeg: { type: Number, required: true, min: 0, default: 200 },  // runner → pickup
  pedestrianMaxDeliveryLeg: { type: Number, required: true, min: 0, default: 800 }, // pickup → delivery
  pedestrianTotalMax: { type: Number, required: true, min: 0, default: 1000 },      // combined cap
}, { timestamps: true });

module.exports = mongoose.model('MatchingConfig', matchingConfigSchema);