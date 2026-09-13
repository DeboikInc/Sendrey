const BaseController = require('./baseController');
const payoutService = require('../services/payoutService');
const logger = require('../utils/logger');

class PayoutController extends BaseController {
    constructor() {
        super(null);
        this.getRunnerPayout = this.getRunnerPayout.bind(this);
        this.getPayoutHistory = this.getPayoutHistory.bind(this);
        this.getRunnerReceipts = this.getRunnerReceipts.bind(this);
        this.submitReceipt = this.submitReceipt.bind(this);
        this.transferToVendor = this.transferToVendor.bind(this);
        this.adminGetAllReceipts = this.adminGetAllReceipts.bind(this);
        this.adminReviewReceipt = this.adminReviewReceipt.bind(this);
        this.adminPayoutStats = this.adminPayoutStats.bind(this);
    }

    _handleError(res, err, fallbackMessage) {
        logger.error(fallbackMessage, err);
        if (err.statusCode) return this.error(res, err.message, err.statusCode);
        return this.error(res, err.message || fallbackMessage);
    }

    async getRunnerPayout(req, res) {
        try {
            const { chatId, orderId } = req.query;
            const result = await payoutService.getRunnerPayout(req.user.id, { chatId, orderId });
            return this.success(res, result);
        } catch (err) {
            return this._handleError(res, err, 'getRunnerPayout error:');
        }
    }

    async getPayoutHistory(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await payoutService.getPayoutHistory(req.user.id, page, limit);
            return this.success(res, result);
        } catch (err) {
            return this._handleError(res, err, 'getPayoutHistory error:');
        }
    }

    async getRunnerReceipts(req, res) {
        try {
            const result = await payoutService.getRunnerReceipts(req.user.id);
            return this.success(res, result);
        } catch (err) {
            return this._handleError(res, err, 'getRunnerReceipts error:');
        }
    }

    async submitReceipt(req, res) {
        try {
            const result = await payoutService.submitReceipt(req.user.id, req.body);
            return this.success(res, result, 'Receipt submitted successfully');
        } catch (err) {
            return this._handleError(res, err, 'submitReceipt error:');
        }
    }

    async transferToVendor(req, res) {
        try {
            const result = await payoutService.transferToVendor({
                ...req.body,
                currentUser: req.user,
            });
            return this.success(res, result, 'Transfer submitted successfully');
        } catch (err) {
            return this._handleError(res, err, 'transferToVendor error:');
        }
    }

    async adminGetAllReceipts(req, res) {
        try {
            const result = await payoutService.adminGetAllReceipts(req.query);
            return this.success(res, result);
        } catch (err) {
            return this._handleError(res, err, 'adminGetAllReceipts error:');
        }
    }

    async adminReviewReceipt(req, res) {
        try {
            const { payoutId, receiptId } = req.params;
            const { action, rejectionReason } = req.body;
            const result = await payoutService.adminReviewReceipt({
                payoutId, receiptId, action, rejectionReason, adminId: req.user.id,
            });
            return this.success(res, result, `Receipt ${action}d successfully`);
        } catch (err) {
            return this._handleError(res, err, 'adminReviewReceipt error:');
        }
    }

    async adminPayoutStats(req, res) {
        try {
            const result = await payoutService.adminPayoutStats();
            return this.success(res, result);
        } catch (err) {
            return this._handleError(res, err, 'adminPayoutStats error:');
        }
    }
}

module.exports = new PayoutController();