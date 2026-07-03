const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'active' },
  platformBankAccount: { type: String, default: null },
  bankName: {type: String, default: null},
  accountName: {type: String, default: null},
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);