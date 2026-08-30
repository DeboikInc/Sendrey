const mongoose = require('mongoose');
const { Schema } = mongoose;

const referralConfigSchema = new Schema(
  {
    singleton: {
      type: String,
      default: 'referral_config',
      unique: true,
    },
    bonusAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReferralConfig', referralConfigSchema);