// controllers/disputeController.js - UPDATED

const BaseController = require('./baseController');
const disputeService = require('../services/disputeService');
const Order = require('../models/Order');
const {
  normaliseServiceType,
  isReasonValid,
  isRunnerReasonValid,
  isItemLevelReason,
  DISPUTE_REASONS,
  RUNNER_DISPUTE_REASONS,
} = require('../utils/disputeReasons');

class DisputeController extends BaseController {
  constructor() {
    super();
    this.raiseDispute = this.raiseDispute.bind(this);
    this.getRunnerDisputes = this.getRunnerDisputes.bind(this);
    this.getUserDisputes = this.getUserDisputes.bind(this);
    this.getDispute = this.getDispute.bind(this);
    this.resolveDispute = this.resolveDispute.bind(this);
    this.getAllDisputes = this.getAllDisputes.bind(this);
  }

  async raiseDispute(req, res) {
    try {
      const { orderId, chatId, reason, description, evidenceFiles } = req.body;
      const userId = req.user._id;
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

      // ── Choose reason set based on who is raising the dispute ──────────────
      let isValid = false;
      let allowedReasons = [];

      if (userType === 'runner') {
        allowedReasons = (RUNNER_DISPUTE_REASONS[normalisedType] ?? []).map(r => r.value);
        isValid = isRunnerReasonValid(order.serviceType, reason);
      } else {
        allowedReasons = (DISPUTE_REASONS[normalisedType] ?? []).map(r => r.value);
        isValid = isReasonValid(order.serviceType, reason);
      }

      // ── Validate reason exists for this service type ───────────────────────
      if (!reason || !allowedReasons.includes(reason)) {
        return this.error(
          res,
          `Invalid dispute reason "${reason}" for ${userType} with service type "${normalisedType}". ` +
          `Allowed: ${allowedReasons.join(', ')}.`
        );
      }

      // ── Validate reason window is still open ───────────────────────────────
      if (!isValid) {
        return this.error(
          res,
          `The dispute window for "${reason}" has closed at order status "${order.status}".`
        );
      }

      // ── usedPayoutSystem only blocks item-level reasons for USERS ──────────
      // Runners can still raise item-level reasons (like wrong_item_given_by_sender)
      if (userType !== 'runner' && order.usedPayoutSystem && isItemLevelReason(reason)) {
        return this.error(
          res,
          'Item-related disputes cannot be raised after vendor payment has been processed.'
        );
      }

      // ── Check if user already has an active dispute for this order ─────────
      const existingDispute = await disputeService.getDisputeByOrderId(orderId);
      if (existingDispute && existingDispute.status === 'open') {
        return this.error(res, 'An active dispute already exists for this order.');
      }

      // ── Raise dispute ──────────────────────────────────────────────────────
      const dispute = await disputeService.raiseDispute({
        orderId,
        chatId,
        raisedBy: userType,
        raisedById: userId,
        reason,
        description,
        evidenceFiles: evidenceFiles || [], // Will contain Cloudinary URLs after upload
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
      // console.error('[resolveDispute controller] error:', error.message, error);
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

  async getUserDisputes(req, res) {
    try {
      const { userId } = req.params;
      const disputes = await disputeService.getDisputesByUserId(userId);
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