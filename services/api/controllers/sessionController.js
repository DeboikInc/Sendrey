
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const BaseController = require('./baseController');
const authService = require('../services/authService');
const TERMINAL_STATUSES = ['cancelled', 'task_completed', 'cancelled'];

class SessionController extends BaseController {

  setAuthCookies = (res, accessToken, refreshToken) => {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  };

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

      const tokenExpired = req.tokenExpired === true || !userId;

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

      // Active order confirmed — now do a REAL refresh using the actual
      // refresh token, same mechanism as /auth/refresh-token.
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const { accessToken, refreshToken: newRefresh } = await authService.refreshTokens(refreshToken);

      this.setAuthCookies(res, accessToken, newRefresh);

      return res.status(200).json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefresh,
          orderId: activeOrder.orderId,
          orderStatus: activeOrder.status,
        }
      });
    } catch (error) {
      console.error('Session refresh error:', error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
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
