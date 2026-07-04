const Order = require('../models/Order');
const Runner = require('../models/Runner');
const User = require('../models/User');
const { Chat } = require('../models/Chat');

const Escrow = require('../models/Escrows');
const Wallet = require('../models/Wallet');
const LedgerEntry = require('../models/LedgerEntry');

const cancelOrder = async ({ orderId, chatId, runnerId, userId, reason, cancelledBy = 'runner' }) => {
  const order = await Order.findOne({
    ...(orderId ? { orderId } : {}),
    ...(chatId ? { chatId } : {})
  }).sort({ createdAt: -1 });

  if (!order) throw new Error('Order not found');

  if (order.paymentStatus === 'paid') {
    throw new Error('Paid orders cannot be cancelled. Please raise a dispute instead.');
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


  await Runner.findByIdAndUpdate(runnerId, {
    isAvailable: true,
    activeOrderId: null,
    currentUserId: null,
  });

  await User.findByIdAndUpdate(userId, {
    isAvailable: true,
    activeOrderId: null,
    currentRunnerId: null,
    $unset: { currentRequest: '' },
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
};

module.exports = { cancelOrder };