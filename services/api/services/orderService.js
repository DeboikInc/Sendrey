const Order = require('../models/Order');
const Runner = require('../models/Runner');
const User = require('../models/User');
const { Chat } = require('../models/Chat');
const Escrow = require('../models/Escrows');
const Wallet = require('../models/Wallet');
const LedgerEntry = require('../models/LedgerEntry');
const { STATUS_GROUPS } = require('../config/constants');
const logger = require('../utils/logger');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const encodeCursor = (doc) =>
  Buffer.from(JSON.stringify({ createdAt: doc.createdAt, _id: doc._id })).toString('base64');

const decodeCursor = (cursor) =>
  JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));

class OrderService {
  constructor() { }

  async getOrderHistory({ userId, status, taskType, search, dateFrom, dateTo, cursor, limit = 20 }) {
    if (!userId) throw new Error('userId is required');

    const filter = { userId };

    if (status) {
      const statuses = STATUS_GROUPS[status];
      if (!statuses) throw new Error(`Invalid status filter: ${status}`);
      filter.status = { $in: statuses };
    }

    if (taskType) filter.taskType = taskType;

    if (search) {
      filter.orderId = { $regex: `^${escapeRegex(search)}`, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (cursor) {
      const { createdAt, _id } = decodeCursor(cursor);
      filter.$or = [
        { createdAt: { $lt: new Date(createdAt) } },
        { createdAt: new Date(createdAt), _id: { $lt: _id } },
      ];
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('runnerId', 'name fleetType serviceType')
      .lean();

    const hasMore = orders.length > limit;
    const page = hasMore ? orders.slice(0, limit) : orders;

    return {
      orders: page,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
    };
  }

  async getOrderByChatId(chatId) {
    const order = await Order.findOne({ chatId })
      .sort({ createdAt: -1 })
      .lean();

    if (!order) throw new Error('No order found for this chat');
    return order;
  }

  async getRunnerOrders(runnerId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ runnerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('orderId serviceType taskType status paymentStatus itemBudget itemLists deliveryFee totalAmount createdAt cancelledAt specialInstructions')
        .lean(),
      Order.countDocuments({ runnerId }),
    ]);

    return {
      orders,
      page,
      hasMore: skip + orders.length < total,
      total,
    };
  }

  async adminGetAllOrders(filters) {
    const {
      page = 1, limit = 20,
      status, paymentStatus,
      runnerId, userId,
      from, to,
    } = filters;

    const skip = (page - 1) * limit;
    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (runnerId) query.runnerId = runnerId;
    if (userId) query.userId = userId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('userId', 'firstName lastName phone email')
        .populate('runnerId', 'firstName lastName phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: skip + orders.length < total,
    };
  }

  async cancelOrder({ orderId, chatId, runnerId, userId, reason, cancelledBy = 'runner' }) {
    const order = await Order.findOne({
      ...(orderId ? { orderId } : {}),
      ...(chatId ? { chatId } : {})
    }).sort({ createdAt: -1 });

    if (!order) throw new Error('Order not found');

    if (!order.canBeCancelled()) {
      const err = new Error(`Order in status "${order.status}" (${order.serviceType}) cannot be cancelled.`);
      err.code = 'NOT_CANCELLABLE';
      throw err;
    }

    await order.updateStatus('cancelled', cancelledBy, {
      note: reason || `Cancelled by ${cancelledBy}`,
      triggeredById: cancelledBy === 'runner' ? runnerId?.toString()
        : cancelledBy === 'user' ? userId?.toString()
          : 'system',
    });

    await Order.findByIdAndUpdate(order._id, {
      $set: {
        cancelledBy: cancelledBy,
        cancellationReason: reason || `Cancelled by ${cancelledBy}`,
      },
    });

    const cancelMessage = {
      id: `cancel-${Date.now()}`,
      from: 'system',
      type: 'system',
      messageType: 'system',
      text: escrowFlagged
        ? `Order cancelled — your payment is held securely and will be reviewed by our team within 24 hours.`
        : reason
          ? `Order cancelled — Reason: ${reason}`
          : `${cancelledBy === 'runner' ? 'Runner' : 'Admin'} has cancelled the order.`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      senderId: 'system',
      senderType: 'system',
      status: 'sent',
    };

    await Chat.findOneAndUpdate(
      { chatId: chatId || order.chatId },
      { $push: { messages: cancelMessage } }
    );

    return { order, cancelMessage, escrowFlagged };
  }
}

module.exports = new OrderService();
