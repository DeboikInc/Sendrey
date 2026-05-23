// controllers/sessionController.js - Fixed

const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const config = require('../config');

const TERMINAL_STATUSES = ['completed', 'cancelled', 'task_completed', 'delivered'];

class SessionController {
  async validateSession(req, res) {
    try {
      const { chatId } = req.body;
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }
      
      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: 'chatId is required'
        });
      }
      
      // Check if there's an active order for this user and chat
      const activeOrder = await Order.findOne({
        userId,
        chatId,
        status: { $nin: TERMINAL_STATUSES }
      }).sort({ createdAt: -1 }).lean();
      
      // If no active order, return 404 - not found
      if (!activeOrder) {
        return res.status(404).json({
          success: false,
          message: 'No active order found for this session',
          data: {
            isValid: false,
            hasActiveOrder: false
          }
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
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  async refreshSession(req, res) {
    try {
      const { chatId } = req.body;
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }
      
      const activeOrder = await Order.findOne({
        userId,
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
          id: userId, 
          type: 'session',
          orderId: activeOrder.orderId,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        },
        config.jwt.secret
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
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
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