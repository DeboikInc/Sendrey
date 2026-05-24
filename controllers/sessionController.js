// controllers/sessionController.js - Fixed

const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const BaseController = require('./baseController');

const TERMINAL_STATUSES = ['completed', 'cancelled', 'task_completed', 'delivered'];

class SessionController extends BaseController {

  async validateSession(req, res) {
    try {
      const { chatId } = req.body;
      const userId = req.user?._id;

      if (!chatId) {
        return res.status(400).json({ success: false, message: 'chatId is required' });
      }

      // If no userId (expired token, not decoded), try to get it from the token directly
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        try {
          const authHeader = req.headers.authorization;
          const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
          if (token) {
            const decoded = jwt.decode(token); // decode without verify
            resolvedUserId = decoded?.id || decoded?.userId || decoded?._id;
          }
        } catch (_) { }
      }

      if (!resolvedUserId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const activeOrder = await Order.findOne({
        $or: [{ userId: resolvedUserId }, { runnerId: resolvedUserId }],
        chatId,
        status: { $nin: TERMINAL_STATUSES }
      }).sort({ createdAt: -1 }).lean();

      if (!activeOrder) {
        return res.status(404).json({
          success: false,
          message: 'No active order found for this session',
          data: { isValid: false, hasActiveOrder: false }
        });
      }

      const tokenExpired = req.tokenExpired === true || !userId; // userId null = token was expired

      return res.status(200).json({
        success: true,
        data: {
          isValid: true,
          hasActiveOrder: true,
          tokenExpired,
          orderId: activeOrder.orderId,
          orderStatus: activeOrder.status
        }
      });
    } catch (error) {
      console.error('Session validation error:', error.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async refreshSession(req, res) {
    try {
      const { chatId } = req.body;
      const userId = req.user?._id;

      if (!chatId) {
        return res.status(400).json({ success: false, message: 'chatId is required' });
      }

      let resolvedUserId = userId;
      if (!resolvedUserId) {
        try {
          const authHeader = req.headers.authorization;
          const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
          if (token) {
            const decoded = jwt.decode(token);
            resolvedUserId = decoded?.id || decoded?.userId || decoded?._id;
          }
        } catch (_) { }
      }

      if (!resolvedUserId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const activeOrder = await Order.findOne({
        $or: [{ userId: resolvedUserId }, { runnerId: resolvedUserId }], // ← was userId (unresolved)
        chatId,
        status: { $nin: TERMINAL_STATUSES }
      }).lean();

      if (!activeOrder) {
        return res.status(404).json({
          success: false,
          message: 'No active order found for this session'
        });
      }

      const sessionToken = jwt.sign(
        {
          id: resolvedUserId,  // ← was userId (could be undefined)
          type: 'session',
          orderId: activeOrder.orderId,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        },
        process.env.JWT_SECRET
      );

      return res.status(200).json({
        success: true,
        data: {
          sessionToken,
          orderId: activeOrder.orderId,
          orderStatus: activeOrder.status,
          expiresIn: 24 * 60 * 60
        }
      });
    } catch (error) {
      console.error('Session refresh error:', error.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getActiveSession(req, res) {
    try {
      const { userId, chatId } = req.params;

      const activeOrder = await Order.findOne({
        userId,
        chatId,
        status: { $nin: TERMINAL_STATUSES }
      }).lean();

      if (!activeOrder) {
        return res.status(404).json({
          success: false,
          message: 'No active session found',
          data: {
            hasActiveSession: false
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          hasActiveSession: true,
          order: {
            orderId: activeOrder.orderId,
            status: activeOrder.status,
            serviceType: activeOrder.serviceType
          }
        }
      });
    } catch (error) {
      console.error('Get active session error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new SessionController();
