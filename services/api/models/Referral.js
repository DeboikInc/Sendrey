const mongoose = require('mongoose');
const { Schema } = mongoose;

const referralSchema = new Schema(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'referrerModel',
    },
    referrerModel: {
      type: String,
      required: true,
      enum: ['User', 'Runner'],
    },
    referred: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'referredModel',
      unique: true, // a person can only be referred once
    },
    referredModel: {
      type: String,
      required: true,
      enum: ['User', 'Runner'],
    },
    codeUsed: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed'],
      default: 'pending',
    },
    bonusAmount: {
      type: Number,
      default: 0,
    },
    bonusAwardedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

referralSchema.index({ referrer: 1, referrerModel: 1 });
referralSchema.index({ status: 1 });

module.exports = mongoose.model('Referral', referralSchema);