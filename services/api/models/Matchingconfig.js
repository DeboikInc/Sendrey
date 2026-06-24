const mongoose = require('mongoose');

const matchingConfigSchema = new mongoose.Schema({
  // Singleton doc — always look up by a fixed key, never by arbitrary _id
  key: { type: String, required: true, unique: true, default: 'active' },

  version: { type: Number, required: true, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

  // All distances in meters.
  // PICKUP_MAX_DISTANCE: max runner→pickup/market leg distance (used by findNearbyRunners)
  pickupMaxDistance: { type: Number, required: true, min: 0 },

  // TOTAL_MAX_DISTANCE: for pedestrian fleet, caps runner→pickup + pickup→delivery COMBINED
  // (used inside findNearbyUsers' pedestrian branch)
  totalMaxDistance: { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MatchingConfig', matchingConfigSchema);