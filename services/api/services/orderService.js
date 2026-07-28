const Order = require('../models/Order');
const Runner = require('../models/Runner');
const User = require('../models/User');
const { Chat } = require('../models/Chat');
const Escrow = require('../models/Escrows');
const Wallet = require('../models/Wallet');
const LedgerEntry = require('../models/LedgerEntry');
const { STATUS_GROUPS } = require('../config/constants');
const logger = require('../utils/logger');
const orderHistoryCache = require('../cache/orderHistoryCache');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OrderActivityLog = require('../models/OrderActivityLog');

const encodeCursor = (doc) =>
  Buffer.from(JSON.stringify({ createdAt: doc.createdAt, _id: doc._id })).toString('base64');

const decodeCursor = (cursor) =>
  JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));

class OrderService {
  constructor() { }

  // for user
  async getUserOrderHistory({ userId, status, taskType, search, dateFrom, dateTo, cursor, limit = 20 }) {
    if (!userId) throw new Error('userId is required');

    const cacheable = orderHistoryCache.isCacheable({ status, taskType, search, dateFrom, dateTo, cursor }) && limit === 20;
    if (cacheable) {
      const cached = await orderHistoryCache.get(userId);
      if (cached) return cached;
    }

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
      .select('orderId serviceType taskType status totalAmount createdAt runnerId')
      .populate('runnerId', 'firstName lastName fleetType serviceType')
      .lean();

    const hasMore = orders.length > limit;
    const page = hasMore ? orders.slice(0, limit) : orders;

    const formatted = page.map((o) => ({
      orderId: o.orderId,
      serviceType: o.serviceType,
      taskType: o.taskType,
      createdAt: o.createdAt,
      status: o.status,
      totalAmount: o.totalAmount,
      runner: o.runnerId
        ? {
          name: [o.runnerId.firstName, o.runnerId.lastName].filter(Boolean).join(' '),
          fleetType: o.runnerId.fleetType,
          serviceType: o.runnerId.serviceType,
        }
        : null,
    }));

    const result = {
      orders: formatted,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
    };

    if (cacheable) await orderHistoryCache.set(userId, result);
    return result;
  }

  async getOrderByChatId(chatId) {
    const order = await Order.findOne({ chatId })
      .sort({ createdAt: -1 })
      .lean();

    return order || null;
  }

  async getRunnerOrderHistory(runnerId, page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const { status, taskType, dateFrom, dateTo, search } = filters;

    const query = { runnerId };

    if (status) query.status = status;
    if (taskType) query.serviceType = taskType;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      query.orderId = { $regex: search, $options: 'i' };
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('orderId serviceType status runnerPayout marketItems pickupItems createdAt')
        .lean(),
      Order.countDocuments(query),
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

    await orderHistoryCache.invalidate(order.userId.toString());

    await Chat.findOneAndUpdate(
      { chatId: chatId || order.chatId },
      { $push: { messages: cancelMessage } }
    );

    return { order, cancelMessage, escrowFlagged };
  }

  async cancelStaleOrders({ filter, reason }) {
    const orders = await Order.find(filter).select('_id orderId userId status');
    const cancellable = orders.filter(o => Order.VALID_TRANSITIONS[o.status]?.includes('cancelled'));
    if (!cancellable.length) return;

    const now = new Date();
    const ids = cancellable.map(o => o._id);

    await Order.updateMany(
      { _id: { $in: ids } },
      {
        $set:
        {
          status: 'cancelled',
          cancelledAt: now, cancelledBy: 'system',
          cancellationReason: reason
        }
      }
    );

    await OrderActivityLog.insertMany(cancellable.map(o => ({
      orderId: o.orderId,
      actorType: 'system',
      actorId: null,
      action: 'status_changed',
      metadata: { from: o.status, to: 'cancelled', note: reason },
      createdAt: now,
    })));

    await Promise.all([...new Set(cancellable.map(o => o.userId.toString()))].map(uid => orderHistoryCache.invalidate(uid)));

  }
}

module.exports = new OrderService();