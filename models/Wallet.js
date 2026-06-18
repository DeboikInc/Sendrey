const mongoose = require('mongoose');
const Transaction = require('./Transactions');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true
  },
  userType: {
    type: String,
    enum: ['user', 'runner'],
    required: true
  },
  _balance: {           // ← renamed, underscore signals private
    type: Number,
    default: 0,
    min: 0,
    select: true,
  },
  stripeAccountId: { type: String, default: null },
  virtualAccountNumber: { type: String, default: null },
  virtualAccountBank: { type: String, default: null },
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed'],
    default: 'active'
  },
  dailyLimit: { type: Number, default: 100000 },
  monthlyLimit: { type: Number, default: 1000000 },
  kycVerified: { type: Boolean, default: false },
  lastTransactionAt: { type: Date, default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Public read-only surface ─────────────────────────────────────────────────
walletSchema.virtual('balance').get(function () {
  return this._balance;
});

// ── Guard: block direct assignment 
walletSchema.virtual('balance').set(function () {
  throw new Error(
    'Direct balance assignment is not allowed. Use wallet.credit() or wallet.debit().'
  );
});

// ── Credit 
walletSchema.methods.credit = async function (amount, reference, metadata = {}) {
  if (typeof amount !== 'number' || amount <= 0) throw new Error('Credit amount must be a positive number');
  if (this.status !== 'active') throw new Error('Wallet is not active');

  // Atomic increment — safe under concurrent requests
  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id, status: 'active' },
    {
      $inc: { _balance: amount },
      $set: { lastTransactionAt: new Date() },
    },
    { new: true }
  );

  if (!updated) throw new Error('Wallet credit failed — wallet may be inactive');

  // Sync in-memory doc so caller sees the new balance immediately
  this._balance = updated._balance;
  this.lastTransactionAt = updated.lastTransactionAt;

  await Transaction.create({
    walletId: this._id,
    type: 'credit',
    amount,
    status: 'completed',
    reference,
    metadata,
    balanceAfter: updated._balance,
  });

  return this;
};


walletSchema.methods.debit = async function (amount, reference, metadata = {}) {
  if (typeof amount !== 'number' || amount <= 0) throw new Error('Debit amount must be a positive number');
  if (this.status !== 'active') throw new Error('Wallet is not active');

  // Atomic decrement with floor guard — DB rejects if _balance would go below 0
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      status: 'active',
      _balance: { $gte: amount },   // ← insufficient funds guard at DB level
    },
    {
      $inc: { _balance: -amount },
      $set: { lastTransactionAt: new Date() },
    },
    { new: true }
  );

  if (!updated) throw new Error('Insufficient wallet balance or wallet inactive');

  this._balance = updated._balance;
  this.lastTransactionAt = updated.lastTransactionAt;

  await Transaction.create({
    walletId: this._id,
    type: 'debit',
    amount,
    status: 'completed',
    reference,
    metadata,
    balanceAfter: updated._balance,
  });

  return this;
};

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;