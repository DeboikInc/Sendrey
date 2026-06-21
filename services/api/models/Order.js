const mongoose = require('mongoose');
const { TASK_TYPES, SERVICE_TYPE } = require('../config/constants');

//  Valid status transitions 
const VALID_TRANSITIONS = {
  pending_payment: ['paid', 'payment_failed', 'cancelled'],
  payment_failed: ['pending_payment', 'cancelled'],
  paid: ['accepted', 'items_submitted', 'items_approved', 'cancelled'],
  accepted: ['en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered', 'items_submitted', 'items_approved', 'shopping'],
  shopping: ['items_submitted', 'cancelled'],
  items_submitted: ['items_approved', 'shopping', 'arrived_at_pickup', 'cancelled'],
  items_approved: ['en_route_to_pickup', 'en_route_to_delivery', 'cancelled'],
  purchase_in_progress: ['purchase_completed', 'cancelled'],
  purchase_completed: ['en_route_to_delivery', 'cancelled'],
  en_route_to_pickup: ['arrived_at_pickup', 'items_submitted', 'cancelled'],
  arrived_at_pickup: ['picked_up', 'items_submitted', 'cancelled'],
  picked_up: ['en_route_to_delivery', 'cancelled'],
  en_route_to_delivery: ['arrived_at_delivery', 'cancelled'],
  arrived_at_delivery: ['delivered', 'cancelled'],
  delivered: ['completed', 'disputed', 'in_progress'],
  active: ['arrived_at_delivery', 'delivered', 'cancelled'],
  item_delivered: ['delivered', 'cancelled'],
  in_progress: ['delivered', 'cancelled'],
  completed: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
};

const TERMINAL_STATUSES = ['completed', 'cancelled'];

const coordinatesSchema = new mongoose.Schema({
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  chatId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  runnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Runner',
    required: true,
    index: true,
  },

  serviceType: {
    type: String,
    enum: [SERVICE_TYPE.RUN_ERRAND, SERVICE_TYPE.DELIVERY],
    required: true,
  },
  taskType: {
    type: String,
    enum: Object.values(TASK_TYPES),
    required: true,
  },

  // ── Locations 
  pickupLocation: { address: String, contactName: String, contactPhone: String },
  deliveryLocation: { address: String, contactName: String, contactPhone: String },
  marketLocation: { address: String },

  marketCoordinates: { type: coordinatesSchema, default: () => ({}) },
  pickupCoordinates: { type: coordinatesSchema, default: () => ({}) },
  deliveryCoordinates: { type: coordinatesSchema, default: () => ({}) },

  // ── Shopping 
  itemsList: [{
    name: String,
    quantity: Number,
    estimatedPrice: Number,
  }],
  itemBudget: { type: Number, default: 0, min: 0 },

  // ── Pricing — all required, locked after creation 
  deliveryFee: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  platformFee: { type: Number, required: true, min: 0 },
  runnerPayout: { type: Number, required: true, min: 0 },

  // ── Routes
  routeDistanceMeters: { type: Number, default: 0 },
  routeLegs: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Payment 
  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow',
    default: null,
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'failed', 'refunded'],
    default: 'unpaid',
  },

  // ── Approval 
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_required'],
    default: 'not_required',
  },
  submittedItems: [{
    name: String,
    price: Number,
    quantity: Number,
    imageUrl: String,
  }],
  receiptImageUrl: { type: String, default: null },
  itemsApprovedAt: { type: Date, default: null },

  // ── Status 
  status: {
    type: String,
    enum: Object.keys(VALID_TRANSITIONS),
    default: 'pending_payment',
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    triggeredBy: { type: String, enum: ['user', 'runner', 'system'] },
    triggeredById: String,
    note: String,
  }],

  // ── Explicit timestamps (not mongoose timestamps option) ───────────────────
  paidAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  itemsSubmittedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  disputedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },

  // ── Delivery confirmation
  deliveryConfirmedAt: { type: Date, default: null },
  deliveryConfirmedBy: {
    type: String,
    enum: ['user', 'system', null],
    default: null,
  },

  // ── Misc 
  specialInstructions: { type: mongoose.Schema.Types.Mixed, default: null },
  pickupItems: { type: String, default: null },
  marketItems: { type: String, default: null },
  fleetType: { type: String, default: null },

  usedPayoutSystem: { type: Boolean, default: false },

  // ── Dispute 
  disputeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute', default: null },
  hasDispute: { type: Boolean, default: false },

  // ── Rating 
  ratingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rating', default: null },
  isRated: { type: Boolean, default: false },

  // ── Runner live location 
  runnerLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: Date,
  },
  estimatedDeliveryTime: { type: Date, default: null },

  // ── Cancellation 
  cancellationReason: { type: String, default: null },
  cancelledBy: {
    type: String,
    enum: ['user', 'runner', 'system', null],
    default: null,
  },

  createdByMember: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,   // gives createdAt + updatedAt correctly
});

// ── Indexes 
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ runnerId: 1, status: 1 });
orderSchema.index({ chatId: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// ── Immutability guard on pricing
const IMMUTABLE_FIELDS = ['deliveryFee', 'totalAmount', 'platformFee', 'runnerPayout',
  'orderId', 'chatId', 'userId', 'runnerId', 'serviceType', 'taskType'];

orderSchema.pre('save', function (next) {
  if (this.isNew) return next();

  for (const field of IMMUTABLE_FIELDS) {
    if (this.isModified(field)) {
      return next(new Error(
        `Order field "${field}" is immutable after creation.`
      ));
    }
  }

  // ── Pricing integrity ──────────────────────────────────────────────────────
  const expectedTotal = this.itemBudget + this.deliveryFee;
  if (Math.abs(expectedTotal - this.totalAmount) > 1) {
    return next(new Error(
      `Order pricing integrity failure: itemBudget(${this.itemBudget}) + ` +
      `deliveryFee(${this.deliveryFee}) = ${expectedTotal} but totalAmount=${this.totalAmount}`
    ));
  }

  next();
});

// ── Guard: block direct status assignment
orderSchema.pre('save', function (next) {
  if (this.isNew) return next();
  if (this.isModified('status') && !this._allowTransition) {
    return next(new Error(
      'Direct status mutation is not allowed. Use order.updateStatus(newStatus, triggeredBy).'
    ));
  }
  next();
});

// ── updateStatus — validated transition + auto timestamps 
orderSchema.methods.updateStatus = async function (newStatus, triggeredBy = 'system', meta = {}) {
  const allowed = VALID_TRANSITIONS[this.status];
  if (!allowed) throw new Error(`Unknown current status: ${this.status}`);
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${this.status} → ${newStatus}. ` +
      `Allowed: [${allowed.join(', ') || 'none'}]`
    );
  }
  if (TERMINAL_STATUSES.includes(this.status)) {
    throw new Error(`Order ${this.orderId} is terminal (${this.status}) and cannot be updated.`);
  }

  // Record the transition
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    triggeredBy,
    triggeredById: meta.triggeredById || null,
    note: meta.note || null,
  });

  // Auto-set relevant timestamp
  const timestampMap = {
    paid: 'paidAt',
    accepted: 'acceptedAt',
    items_submitted: 'itemsSubmittedAt',
    delivered: 'deliveredAt',
    completed: 'completedAt',
    disputed: 'disputedAt',
    cancelled: 'cancelledAt',
  };
  if (timestampMap[newStatus]) this[timestampMap[newStatus]] = new Date();

  this._allowTransition = true;
  this.status = newStatus;
  await this.save();
  this._allowTransition = false;

  return this;
};

// ── canBeCancelled 
orderSchema.methods.canBeCancelled = function () {
  return VALID_TRANSITIONS[this.status]?.includes('cancelled') ?? false;
};

// ── needsItemApproval
orderSchema.methods.needsItemApproval = function () {
  return this.serviceType === SERVICE_TYPE.RUN_ERRAND &&
    this.approvalStatus === 'pending';
};

// ── generateOrderId 
orderSchema.statics.generateOrderId = function () {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

orderSchema.statics.VALID_TRANSITIONS = VALID_TRANSITIONS;

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;