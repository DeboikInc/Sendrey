const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userType: { type: String, enum: ['user', 'runner'], required: true },
  socketId: String,
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false }
});

module.exports = mongoose.model('Session', sessionSchema);