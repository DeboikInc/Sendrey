const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userType: { type: String, enum: ['user', 'runner'], required: true },
  tokenHash: { type: String, required: true, unique: true },
  previousTokenHash: { type: String, default: null },
  deviceInfo: {
    userAgent: String,
    ip: String,
    label: String, // e.g. "Chrome on Windows"
  },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  previousTokenExpiresAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

module.exports = mongoose.model('AuthSession', authSessionSchema);