const mongoose = require('mongoose');

const VALID_TRANSITIONS = {
  pending:   ['completed', 'failed'],
  completed: [],                      // terminal — nothing can follow
  failed:    ['reversed'],
  reversed:  [],                      // terminal
};

const transactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'escrow_lock', 'escrow_release', 'refund', 'payout'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Transaction amount must be at least 1'],  // 0-amount transactions are bugs
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending',
  },
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // Payment processor references
  paystackReference: { type: String, default: null },
  paystackTransferId: { type: String, default: null },

  // Related records
  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow',
    default: null,
  },
  taskId: { type: String, default: null },
  orderId: { type: String, default: null },

  // Balance tracking — both required, captured at write time
  balanceBefore: {
    type: Number,
    required: [true, 'balanceBefore must be recorded at transaction creation'],
    min: 0,
  },
  balanceAfter: {
    type: Number,
    required: [true, 'balanceAfter must be recorded at transaction creation'],
    min: 0,
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  errorMessage: { type: String, default: null },
  completedAt:  { type: Date, default: null },
  failedAt:     { type: Date, default: null },
  reversedAt:   { type: Date, default: null },
}, {
  timestamps: true,
});

// ── Indexes ───────────────────────────────────────────────────────────────────
transactionSchema.index({ walletId: 1, createdAt: -1 });
transactionSchema.index({ walletId: 1, status: 1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ orderId: 1 }, { sparse: true });
transactionSchema.index({ escrowId: 1 }, { sparse: true });

// ── Guard: block direct status assignment, force transition() ─────────────────
transactionSchema.pre('save', function (next) {
  if (this.isModified('status') && !this._allowTransition) {
    return next(new Error(
      'Direct status mutation is not allowed. Use transaction.transition(newStatus).'
    ));
  }
  next();
});

// ── Status transition — the only way to move status ──────────────────────────
transactionSchema.methods.transition = async function (newStatus, extra = {}) {
  const allowed = VALID_TRANSITIONS[this.status];
  if (!allowed) throw new Error(`Unknown current status: ${this.status}`);
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${this.status} → ${newStatus}. Allowed: [${allowed.join(', ') || 'none'}]`
    );
  }

  this._allowTransition = true;
  this.status = newStatus;

  if (newStatus === 'completed') this.completedAt = new Date();
  if (newStatus === 'failed')    { this.failedAt = new Date(); this.errorMessage = extra.errorMessage || null; }
  if (newStatus === 'reversed')  this.reversedAt = new Date();

  await this.save();
  this._allowTransition = false;
  return this;
};

// ── Idempotent create — safe to call multiple times with same reference ───────
transactionSchema.statics.createIdempotent = async function (data) {
  const existing = await this.findOne({ reference: data.reference });
  if (existing) {
    console.warn('[Transaction] idempotent hit — returning existing:', data.reference);
    return { transaction: existing, created: false };
  }
  const transaction = await this.create(data);
  return { transaction, created: true };
};

// ── Integrity check — balanceBefore + amount should equal balanceAfter ────────
transactionSchema.methods.verifyIntegrity = function () {
  const expected = this.type === 'debit' || this.type === 'escrow_lock'
    ? this.balanceBefore - this.amount
    : this.balanceBefore + this.amount;

  if (Math.abs(expected - this.balanceAfter) > 0.01) {
    throw new Error(
      `Balance integrity failure on tx ${this.reference}: ` +
      `before=${this.balanceBefore} amount=${this.amount} after=${this.balanceAfter} expected=${expected}`
    );
  }
  return true;
};

const Transaction = require('./Transactions');
module.exports = Transaction;