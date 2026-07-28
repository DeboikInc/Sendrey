const BaseController = require('./baseController');
const orderService = require('../services/orderService');
const logger = require('../utils/logger');

class OrderController extends BaseController {
  constructor() {
    super(null);
    this.getUserOrderHistory = this.getUserOrderHistory.bind(this);
    this.getRunnerOrderHistory = this.getRunnerOrderHistory.bind(this);
    this.getOrderByChatId = this.getOrderByChatId.bind(this);
    this.adminGetAllOrders = this.adminGetAllOrders.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
  }

  async getUserOrderHistory(req, res) {
    try {
      const userId = req.user.id || req.userId;

      if (!userId) {
        return this.error(res, 'User ID not found', 401);
      }

      const { status, taskType, search, dateFrom, dateTo, cursor, limit } = req.query;

      const result = await orderService.getUserOrderHistory({
        userId,
        status,
        taskType,
        search,
        dateFrom,
        dateTo,
        cursor,
        limit: parseInt(limit) || 20
      });

      return this.success(res, result);
    } catch (err) {
      logger.error('getOrderHistory error:', err);
      return this.error(res, err.message);
    }
  }

  async getOrderByChatId(req, res) {
    try {
      const { chatId } = req.params;

      if (!chatId) {
        return this.error(res, 'Chat ID not found', 400);
      }
      const order = await orderService.getOrderByChatId(chatId);
      return this.success(res, order);
    } catch (err) {
      logger.error('getOrderByChatId error:', err);
      return this.error(res, err.message);
    }
  }

  async getRunnerOrderHistory(req, res) {
    try {
      const { runnerId } = req.params;

      if (!runnerId) {
        return this.error(res, 'Runner Id not found', 400);
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { status, taskType, dateFrom, dateTo, search } = req.query;

      const result = await orderService.getRunnerOrderHistory(runnerId, page, limit, {
        status, taskType, dateFrom, dateTo, search,
      });
      return this.success(res, result);
    } catch (err) {
      logger.error('getRunnerOrderHistory error:', err);
      return this.error(res, err.message);
    }
  }

  async adminGetAllOrders(req, res) {
    try {
      const result = await orderService.adminGetAllOrders(req.query);
      return this.success(res, result);
    } catch (err) {
      logger.error('adminGetAllOrders error:', err);
      return this.error(res, err.message);
    }
  }

  async cancelOrder(req, res) {
    try {
      const { orderId, chatId, runnerId, userId, reason, cancelledBy } = req.body;

      if (!orderId) {
        return this.error(res, 'Order not found', 400);
      }

      if (!runnerId && !userId) {
        return this.error(res, 'User or Runner not found', 400);
      }

      const result = await orderService.cancelOrder({
        orderId,
        chatId,
        runnerId,
        userId,
        reason,
        cancelledBy
      });

      return this.success(res, result);
    } catch (err) {
      logger.error('cancelOrder error:', err);
      return this.error(res, err.message);
    }
  }
}

module.exports = new OrderController();