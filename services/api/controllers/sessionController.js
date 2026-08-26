const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const BaseController = require('./baseController');
const authService = require('../services/authService');
const redis = require('../config/redis');
const { setAuthCookies } = require('../utils/authCookies');

const TERMINAL_STATUSES = ['completed', 'cancelled', 'task_completed', 'delivered'];

class SessionController extends BaseController {

  setAuthCookies = setAuthCookies;

  async validateSession(req, res) {
    try {
      const { chatId } = req.body;

      if (!chatId) {
        return res.status(400).json({ success: false, message: 'chatId is required' });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const resolvedUserId = req.user._id;

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

      const tokenExpired = req.tokenExpired === true;

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

      if (!chatId) {
        return res.status(400).json({ success: false, message: 'chatId is required' });
      }

      const resolvedUserId = req.user._id;

      const activeOrder = await Order.findOne({
        $or: [{ userId: resolvedUserId }, { runnerId: resolvedUserId }],
        chatId,
        status: { $nin: TERMINAL_STATUSES }
      }).lean();

      if (!activeOrder) {
        return res.status(404).json({
          success: false,
          message: 'No active order found for this session'
        });
      }

      const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
      if (!incomingToken) {
        return res.status(401).json({ success: false, message: 'No refresh token provided' });
      }

      const tokenHash = authService._hashToken(incomingToken);

      // Replay cache — same guard as AuthController.refreshToken, since this
      // hits the identical authService.refreshTokens() rotation and is
      // vulnerable to the same concurrent-request race (e.g. app resume from
      // background firing alongside an already-queued refresh).
      const cached = await redis.get(`refresh_replay:${tokenHash}`);
      if (cached) {
        const { accessToken, refreshToken: cachedRefresh } = JSON.parse(cached);
        this.setAuthCookies(res, accessToken, cachedRefresh);
        return res.status(200).json({
          success: true,
          data: {
            accessToken,
            refreshToken: cachedRefresh,
            orderId: activeOrder.orderId,
            orderStatus: activeOrder.status,
          }
        });
      }

      let result;
      try {
        result = await authService.refreshTokens(incomingToken);
      } catch (err) {
        if (err.statusCode === 401) {
          await new Promise(r => setTimeout(r, 150));
          const raced = await redis.get(`refresh_replay:${tokenHash}`);
          if (raced) {
            const { accessToken, refreshToken: cachedRefresh } = JSON.parse(raced);
            this.setAuthCookies(res, accessToken, cachedRefresh);
            return res.status(200).json({
              success: true,
              data: {
                accessToken,
                refreshToken: cachedRefresh,
                orderId: activeOrder.orderId,
                orderStatus: activeOrder.status,
              }
            });
          }
        }
        throw err;
      }

      const { accessToken, refreshToken: newRefresh } = result;

      await redis.set(
        `refresh_replay:${tokenHash}`,
        JSON.stringify({ accessToken, refreshToken: newRefresh }),
        'EX',
        30
      );

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