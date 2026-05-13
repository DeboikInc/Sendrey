const mongoose = require('mongoose');

const VALID_TRANSITIONS = {
  pending:  ['settled', 'failed'],
  settled:  [],   // terminal
  failed:   [],   // terminal
};

const platformEarningsSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    index: true,
  },
  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow',
    required: true,
  },


  amount: {
    type: Number,
    required: true,
    min: [0, 'amount cannot be negative'],
  },
  providerFee: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  netAmount: {   // amount platform  keeps
    type: Number,
    required: true,
    min: 0,
  },

  type: {
    type: String,
    enum: ['platform_fee', 'cancellation_fee', 'dispute_resolution', 'platform_fee_plus_forfeited_runner_fee'],
    required: true,
    default: 'platform_fee',
  },

  //  prevent double-recording from webhook retries 
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  paystackTransferCode: { type: String, default: null },

  status: {
    type: String,
    enum: Object.keys(VALID_TRANSITIONS),
    default: 'pending',
  },

  settledAt: { type: Date, default: null },
  failedAt:  { type: Date, default: null },
  failureReason: { type: String, default: null },

  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Indexes 
platformEarningsSchema.index({ status: 1, createdAt: -1 });
platformEarningsSchema.index({ escrowId: 1 });


const IMMUTABLE_FIELDS = ['amount', 'providerFee', 'netAmount', 'orderId', 'escrowId', 'type', 'idempotencyKey'];

platformEarningsSchema.pre('save', function (next) {
  if (this.isNew) {
   
    const expected = this.amount - this.providerFee;
    if (Math.abs(expected - this.netAmount) > 1) {
      return next(new Error(
        `PlatformEarnings integrity failure: amount(${this.amount}) - providerFee(${this.providerFee}) = ${expected} but netAmount=${this.netAmount}`
      ));
    }
    return next();
  }

  for (const field of IMMUTABLE_FIELDS) {
    if (this.isModified(field)) {
      return next(new Error(`PlatformEarnings field "${field}" is immutable after creation.`));
    }
  }

  if (this.isModified('status') && !this._allowTransition) {
    return next(new Error('Direct status mutation blocked. Use platformEarning.settle() or .fail().'));
  }

  next();
});


platformEarningsSchema.methods.settle = async function (paystackTransferCode = null) {
  if (!VALID_TRANSITIONS[this.status].includes('settled')) {
    throw new Error(`Cannot settle from status: ${this.status}`);
  }
  this._allowTransition = true;
  this.status = 'settled';
  this.settledAt = new Date();
  if (paystackTransferCode) this.paystackTransferCode = paystackTransferCode;
  await this.save();
  this._allowTransition = false;
  return this;
};

// ── fail() ────────────────────────────────────────────────────────────────────
platformEarningsSchema.methods.fail = async function (reason = '') {
  if (!VALID_TRANSITIONS[this.status].includes('failed')) {
    throw new Error(`Cannot fail from status: ${this.status}`);
  }
  this._allowTransition = true;
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  await this.save();
  this._allowTransition = false;
  return this;
};

// ── Idempotent create ─────────────────────────────────────────────────────────
platformEarningsSchema.statics.createIdempotent = async function (data) {
  const key = data.idempotencyKey ?? `${data.orderId}-${data.type}`;

  const existing = await this.findOne({ idempotencyKey: key });
  if (existing) {
    console.warn('[PlatformEarnings] idempotent hit:', key);
    return { record: existing, created: false };
  }

  const record = await this.create({
    ...data,
    idempotencyKey: key,
    netAmount: data.netAmount ?? (data.amount - (data.providerFee ?? 0)),
  });

  return { record, created: true };
};

const PlatformEarnings = mongoose.model('PlatformEarnings', platformEarningsSchema);
module.exports = PlatformEarnings;