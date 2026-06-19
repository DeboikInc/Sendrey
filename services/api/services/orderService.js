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

  let escrowFlagged = false;

  // Handle paid orders — return funds to escrow for admin review
  if (order.paymentStatus === 'paid') {
    const escrow = await Escrow.findOne({ taskId: order.orderId });

    if (escrow && escrow.status === 'funded') {
      // If wallet payment, unlock the locked balance back to available
      const userWallet = await Wallet.findOne({ userId: order.userId, userType: 'user' });
      if (userWallet && userWallet.lockedBalance >= escrow.totalAmount) {
        // Deduct from lockedBalance directly (it's not a balance field, it's a lock tracker)
        await Wallet.findByIdAndUpdate(userWallet._id, {
          $inc: { lockedBalance: -escrow.totalAmount },
        });

        // Credit the unlocked amount back to available balance
        await userWallet.credit(
          escrow.totalAmount,
          `unlock-cancel-${order.orderId}-${Date.now()}`,
          { reason: 'order_cancelled', orderId: order.orderId, cancelledBy }
        );
      }

      await Escrow.findByIdAndUpdate(order.escrowId, {
        status: 'disputed',
        metadata: {
          ...escrow.metadata,
          adminReview: true,
          cancelledBy,
          cancellationReason: reason || `Cancelled by ${cancelledBy}`,
          cancelledAt: new Date(),
          awaitingAdminRefund: true,
        }
      });

      await LedgerEntry.create({
        userId: order.userId,
        userModel: 'User',
        runnerId: order.runnerId,
        type: 'escrow_lock',
        grossAmount: escrow.totalAmount,
        netAmount: escrow.totalAmount,
        providerFee: 0,
        platformFee: 0,
        netPlatformFee: 0,
        runnerFee: 0,
        provider: 'system',
        orderId: order.orderId,
        escrowId: escrow._id,
        description: `Order ${order.orderId} cancelled by ${cancelledBy} — held in escrow pending admin review`,
        status: 'pending',
        balanceBefore: userWallet?._balance ?? 0,
        balanceAfter: userWallet?._balance ?? 0,
      });

      escrowFlagged = true;
      console.log(`Escrow ${escrow._id} flagged for admin review after cancellation of paid order ${order.orderId}`);
    }
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