const BaseController = require('./baseController');
const disputeService = require('../services/disputeService');
const Order = require('../models/Order');

// Mirror of the client-side util — single source of truth for reason windows.

const RUN_ERRAND_REASONS = [
  {
    value: 'proof_fraud',
    windowClosesAfter: [
      'purchase_completed', 'en_route_to_delivery',
      'arrived_at_delivery_location', 'item_delivered', 'task_completed', 'completed',
    ],
  },
  {
    value: 'item_not_delivered',
    windowClosesAfter: ['item_delivered', 'task_completed', 'completed'],
  },
  {
    value: 'item_damaged_in_transit',
    windowClosesAfter: ['completed'],
  },
  {
    value: 'runner_misconduct',
    windowClosesAfter: ['completed'],
  },
  {
    value: 'runner_unresponsive',
    windowClosesAfter: ['task_completed', 'completed'],
  },
  {
    value: 'other',
    windowClosesAfter: ['completed'],
  },
];

const PICK_UP_REASONS = [
  {
    value: 'item_not_collected',
    windowClosesAfter: [
      'en_route_to_delivery', 'arrived_at_delivery_location',
      'item_delivered', 'task_completed', 'completed',
    ],
  },
  {
    value: 'wrong_item_collected',
    windowClosesAfter: [
      'en_route_to_delivery', 'arrived_at_delivery_location',
      'item_delivered', 'task_completed', 'completed',
    ],
  },
  {
    value: 'item_not_delivered',
    windowClosesAfter: ['item_delivered', 'task_completed', 'completed'],
  },
  {
    value: 'item_damaged_in_transit',
    windowClosesAfter: ['completed'],
  },
  {
    value: 'runner_misconduct',
    windowClosesAfter: ['completed'],
  },
  {
    value: 'runner_unresponsive',
    windowClosesAfter: ['task_completed', 'completed'],
  },
  {
    value: 'other',
    windowClosesAfter: ['completed'],
  },
];

const DISPUTE_REASONS = {
  'run-errand': RUN_ERRAND_REASONS,
  'pick-up':    PICK_UP_REASONS,
};

function normaliseServiceType(serviceType = '') {
  const s = serviceType.toLowerCase();
  if (s.includes('errand')) return 'run-errand';
  if (s.includes('pick'))   return 'pick-up';
  return null;
}

function isReasonValid(serviceType, orderStatus, reason) {
  const type = normaliseServiceType(serviceType);
  if (!type) return false;
  const match = (DISPUTE_REASONS[type] ?? []).find(r => r.value === reason);
  if (!match) return false;
  return !match.windowClosesAfter.includes(orderStatus);
}

// Reasons that are purely about item/vendor — these are the only ones
// blocked by usedPayoutSystem (vendor already paid, money gone).
const ITEM_LEVEL_REASONS = new Set([
  'proof_fraud',
  'item_not_delivered',
  'item_damaged_in_transit',
  'item_not_collected',
  'wrong_item_collected',
]);

class DisputeController extends BaseController {
  constructor() {
    super();
    this.raiseDispute    = this.raiseDispute.bind(this);
    this.getRunnerDisputes = this.getRunnerDisputes.bind(this);
    
    this.getDispute      = this.getDispute.bind(this);
    this.resolveDispute  = this.resolveDispute.bind(this);
    this.getAllDisputes   = this.getAllDisputes.bind(this);
  }

  async raiseDispute(req, res) {
    try {
      const { orderId, chatId, reason, description, evidenceFiles } = req.body;
      const userId   = req.user._id;
      const userType = req.user.userType || 'user';

      // ── Fetch order ────────────────────────────────────────────────────────
      const order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
      if (!order) return this.error(res, 'Order not found.');

      // ── Terminal / already-disputed orders ─────────────────────────────────
      if (['cancelled', 'disputed', 'dispute_resolved', 'archived'].includes(order.status)) {
        return this.error(res, `Cannot raise a dispute on an order with status: ${order.status}.`);
      }

      // ── Normalise service type ─────────────────────────────────────────────
      const normalisedType = normaliseServiceType(order.serviceType);
      if (!normalisedType) {
        return this.error(res, `Unsupported service type for disputes: ${order.serviceType}`);
      }

      // ── Validate reason exists for this service type ───────────────────────
      const allowedReasons = (DISPUTE_REASONS[normalisedType] ?? []).map(r => r.value);
      if (!reason || !allowedReasons.includes(reason)) {
        return this.error(
          res,
          `Invalid dispute reason "${reason}" for service type "${normalisedType}". ` +
          `Allowed: ${allowedReasons.join(', ')}.`
        );
      }

      // ── usedPayoutSystem only blocks item-level reasons ────────────────────
      // Runner misconduct, unresponsive, and other can still be raised after
      // vendor payment — those aren't about the item/money flow.
      if (order.usedPayoutSystem && ITEM_LEVEL_REASONS.has(reason)) {
        return this.error(
          res,
          'Item-related disputes cannot be raised after vendor payment has been processed.'
        );
      }

      // ── Per-reason window check ────────────────────────────────────────────
      // Each reason carries its own windowClosesAfter — this is the core gate.
      if (!isReasonValid(order.serviceType, order.status, reason)) {
        return this.error(
          res,
          `The dispute window for "${reason}" has closed at order status "${order.status}".`
        );
      }

      // ── Raise dispute ──────────────────────────────────────────────────────
      const dispute = await disputeService.raiseDispute({
        orderId,
        chatId,
        raisedBy:   userType,
        raisedById: userId,
        reason,
        description,
        evidenceFiles,
      });

      return this.success(res, dispute);
    } catch (error) {
      console.error('raiseDispute error:', error.message, error);
      return this.error(res, error.message);
    }
  }

  async resolveDispute(req, res) {
    try {
      const { disputeId } = req.params;
      const { outcome, releasePercentage, adminNote } = req.body;
      const resolvedBy = req.user._id;

      const result = await disputeService.resolveDispute({
        disputeId,
        outcome,
        releasePercentage,
        adminNote,
        resolvedBy,
      });

      return this.success(res, result);
    } catch (error) {
      return this.error(res, error.message);
    }
  }

  async getRunnerDisputes(req, res) {
    try {
      const { runnerId } = req.params;
      const disputes = await disputeService.getDisputesByRunnerId(runnerId);
      return this.success(res, { disputes });
    } catch (error) {
      return this.error(res, error.message);
    }
  }

  async getDispute(req, res) {
    try {
      const { orderId } = req.params;
      const dispute = await disputeService.getDisputeByOrderId(orderId);
      if (!dispute) return this.notFound(res, 'Dispute not found');
      return this.success(res, dispute);
    } catch (error) {
      return this.error(res, error.message);
    }
  }

  async getAllDisputes(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const result = await disputeService.getAllDisputes(
        parseInt(page),
        parseInt(limit),
        status
      );
      return this.success(res, result);
    } catch (error) {
      return this.error(res, error.message);
    }
  }
}

module.exports = new DisputeController();