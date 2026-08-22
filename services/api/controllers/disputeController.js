const BaseController = require('./baseController');
const disputeService = require('../services/disputeService');

class DisputeController extends BaseController {
  constructor() {
    super();
    this.raiseDispute = this.raiseDispute.bind(this);
    this.getRunnerDisputes = this.getRunnerDisputes.bind(this);
    this.getUserDisputes = this.getUserDisputes.bind(this);
    this.getDispute = this.getDispute.bind(this);
    this.resolveDispute = this.resolveDispute.bind(this);
    this.getAllDisputes = this.getAllDisputes.bind(this);
    this.getUserDisputeCategories = this.getUserDisputeCategories.bind(this);
    this.getRunnerDisputeCategories = this.getRunnerDisputeCategories.bind(this);
    this.getDisputableOrders = this.getDisputableOrders.bind(this);
  }

  async getUserDisputeCategories(req, res) {
    try {
      return this.success(res, { categories: disputeService.getUserDisputeReasons() });
    } catch (error) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  async getRunnerDisputeCategories(req, res) {
    try {
      return this.success(res, { categories: disputeService.getRunnerDisputeReasons() });
    } catch (error) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  async getDisputableOrders(req, res) {
    try {
      const runnerId = req.runner?._id;
      const userId = req.user?._id;

      if (!runnerId && !userId) {
        return this.error(res, 'Not authenticated', 401);
      }

      const partyType = runnerId ? 'runner' : 'user';
      const partyId = runnerId || userId;

      const orders = await disputeService.getDisputableOrders({ partyId, partyType });

      return this.success(res, { orders });
    } catch (error) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  async raiseDispute(req, res) {
    try {
      const { orderId, chatId, category, description, evidenceFiles } = req.body;
      const userId = req.user._id;
      const userType = req.user.userType || 'user';

      const dispute = await disputeService.raiseDispute({
        orderId,
        chatId,
        raisedBy: userType,
        raisedById: userId,
        category,
        description,
        evidenceFiles: evidenceFiles || [],
      });

      return this.success(res, dispute);
    } catch (error) {
      console.error('raiseDispute error:', error.message, error);
      return this.error(res, error.message, error.statusCode);
    }
  }

  async resolveDispute(req, res) {
    try {
      const { disputeId } = req.params;
      const { outcome, releasePercentage, adminNote } = req.body;

      const result = await disputeService.resolveDispute({
        disputeId,
        outcome,
        releasePercentage,
        adminNote,
        resolvedBy: req.user._id,
        resolvedByRole: req.user.role,
      });

      return this.success(res, result);
    } catch (error) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  async getRunnerDisputes(req, res) {
    try {
      const { runnerId } = req.params;
      const disputes = await disputeService.getDisputesByRunnerId(runnerId);
      return this.success(res, { disputes });
    } catch (error) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  async getUserDisputes(req, res) {
    try {
      const { userId } = req.params;
      const disputes = await disputeService.getDisputesByUserId(userId);
      return this.success(res, { disputes });
    } catch (error) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  async getDispute(req, res) {
    try {
      const { orderId } = req.params;
      const dispute = await disputeService.getDisputeByOrderId(orderId);
      if (!dispute) return this.notFound(res, 'Dispute not found');
      return this.success(res, dispute);
    } catch (error) {
      return this.error(res, error.message, error.statusCode);
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
      return this.error(res, error.message, error.statusCode);
    }
  }
}

module.exports = new DisputeController();