const mongoose = require('mongoose');

const receiptHistorySchema = new mongoose.Schema({
  submissionId: { type: String },
  receiptUrl: { type: String, default: null },
  vendorName: { type: String, default: null },
  amountSpent: { type: Number, default: 0 },
  changeAmount: { type: Number, default: 0 },
  bankDetails: {
    bankName: { type: String, default: null },
    accountNumber: { type: String, default: null },
    accountName: { type: String, default: null },
  },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedAt: { type: Date, default: null },
}, { _id: false });

const runnerPayoutSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  chatId: { type: String, index: true },
  runnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Runner', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  escrowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow', default: null },
  itemBudget: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  runnerPayout: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected', 'paid'],
    default: 'pending',
  },
  usedPayoutSystem: { type: Boolean, default: false },
  vendorName: { type: String, default: null },
  amountSpent: { type: Number, default: null },
  changeAmount: { type: Number, default: null },
  receiptUrl: { type: String, default: null },
  bankDetails: {
    bankName: { type: String, default: null },
    accountNumber: { type: String, default: null },
    accountName: { type: String, default: null },
  },
  receiptHistory: { type: [receiptHistorySchema], default: [] },
  submittedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
}, { timestamps: true });

const RunnerPayout = mongoose.model('RunnerPayout', runnerPayoutSchema);
module.exports = RunnerPayout;