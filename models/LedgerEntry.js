const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   default: null },
  runnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Runner', default: null },

  type: {
    type: String,
    enum: [
      'deposit',
      'escrow_lock',
      'escrow_refund',
      'escrow_release',
      'item_budget',
      'item_budget_spent',
      'platform_earning',
      'provider_fee',
      'withdrawal',
      'refund',
    ],
    required: true,
  },

  
  grossAmount:    { type: Number, required: true, min: [0, 'grossAmount cannot be negative'] },
  netAmount:      { type: Number, required: true, min: [0, 'netAmount cannot be negative'] },
  providerFee:    { type: Number, required: true, default: 0, min: 0 },
  platformFee:    { type: Number, required: true, default: 0, min: 0 },
  netPlatformFee: { type: Number, required: true, default: 0 },  // can be 0 if fee < providerFee
  runnerFee:      { type: Number, required: true, default: 0, min: 0 },

  provider: {
    type: String,
    enum: ['paystack', 'wallet', 'system'],
    required: true,
  },
  providerReference: { type: String, default: null },

  orderId:  { type: String, default: null },
  escrowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow', default: null },
  chatId:   { type: String, default: null },

  description: { type: String, required: true },  // force callers to be explicit

  // ── Status is narrower for a ledger — only pending→completed or pending→failed
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],  // no 'reversed' — reversals are new entries
    default: 'pending',
  },

  // ── Reversal linkage — instead of mutating, create a new entry ────────────
  reversalOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerEntry',
    default: null,
  },
  reversedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerEntry',
    default: null,
  },

  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Indexes
ledgerEntrySchema.index({ userId: 1, createdAt: -1 });
ledgerEntrySchema.index({ runnerId: 1, createdAt: -1 });
ledgerEntrySchema.index({ orderId: 1 });
ledgerEntrySchema.index({ escrowId: 1 }, { sparse: true });
ledgerEntrySchema.index({ type: 1, status: 1 });
ledgerEntrySchema.index({ providerReference: 1 }, { unique: true, sparse: true });
ledgerEntrySchema.index({ reversalOf: 1 }, { sparse: true });

// ── Immutability guard 
// A completed ledger entry must never be mutated — money fields and type are
// locked the moment the entry is created. Only status can move pending→completed/failed.
const IMMUTABLE_FIELDS = ['grossAmount', 'netAmount', 'providerFee', 'platformFee',
  'netPlatformFee', 'runnerFee', 'type', 'userId', 'runnerId', 'orderId',
  'escrowId', 'chatId', 'reversalOf'];

ledgerEntrySchema.pre('save', function (next) {
  if (this.isNew) {
    // ── Integrity check on creation 
    const feeSum = this.providerFee + this.platformFee + this.runnerFee;
    if (Math.abs(feeSum - this.grossAmount) > 1 && this.type === 'escrow_release') {
      // escrow_release: grossAmount should equal the sum of all fee splits
      return next(new Error(
        `LedgerEntry integrity failure: grossAmount=${this.grossAmount} ` +
        `but providerFee+platformFee+runnerFee=${feeSum}`
      ));
    }
    if (this.netAmount > this.grossAmount) {
      return next(new Error(
        `LedgerEntry integrity failure: netAmount (${this.netAmount}) exceeds grossAmount (${this.grossAmount})`
      ));
    }
    return next();
  }

  // After creation, immutable fields must not change 
  for (const field of IMMUTABLE_FIELDS) {
    if (this.isModified(field)) {
      return next(new Error(
        `LedgerEntry is immutable — field "${field}" cannot be changed after creation.`
      ));
    }
  }

  next();
});

// ── Idempotent create ─────────────────────────────────────────────────────────
ledgerEntrySchema.statics.createIdempotent = async function (data) {
  if (data.providerReference) {
    const existing = await this.findOne({ providerReference: data.providerReference });
    if (existing) {
      console.warn('[LedgerEntry] idempotent hit:', data.providerReference);
      return { entry: existing, created: false };
    }
  }
  const entry = await this.create(data);
  return { entry, created: true };
};

// ── Reversal — creates a new offsetting entry, never mutates the original ─────
ledgerEntrySchema.statics.reverse = async function (entryId, reason = '') {
  const original = await this.findById(entryId);
  if (!original) throw new Error(`LedgerEntry ${entryId} not found`);
  if (original.status !== 'completed') throw new Error(`Only completed entries can be reversed`);
  if (original.reversedBy) throw new Error(`LedgerEntry ${entryId} already reversed`);

  const reversal = await this.create({
    userId:           original.userId,
    runnerId:         original.runnerId,
    type:             original.type,
    grossAmount:      original.grossAmount,
    netAmount:        original.netAmount,
    providerFee:      original.providerFee,
    platformFee:      original.platformFee,
    netPlatformFee:   original.netPlatformFee,
    runnerFee:        original.runnerFee,
    provider:         original.provider,
    providerReference: original.providerReference
      ? `reversal-${original.providerReference}`
      : null,
    orderId:     original.orderId,
    escrowId:    original.escrowId,
    chatId:      original.chatId,
    description: `Reversal of ${original._id}${reason ? ': ' + reason : ''}`,
    status:      'completed',
    reversalOf:  original._id,
    metadata:    { ...original.metadata, reversalReason: reason },
  });

  // Link original → reversal (this is the one mutation allowed on a completed entry)
  await this.findByIdAndUpdate(entryId, { reversedBy: reversal._id });

  return reversal;
};

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);