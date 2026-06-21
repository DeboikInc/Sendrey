// utils/handleRejectionStrike.js
const Runner = require('../models/Runner');
const { Chat } = require('../models/Chat');
const Order = require('../models/Order');
const Escrow = require('../models/Escrows');
const paymentService = require('../services/paymentServices');
const { sendPushNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

const persistMessages = async (chatId, messages) => {
  await Chat.findOneAndUpdate(
    { chatId },
    { $push: { messages: { $each: messages } } },
    { upsert: true }
  );
};

const handleRejectionStrike = async (io, runnerId, chatId) => {
  logger.info(`[rejectionStrike] Processing strike for runner ${runnerId} in chat ${chatId} | field: ${countField}`)

  const runner = await Runner.findByIdAndUpdate(
    runnerId,
    { $inc: { [countField]: 1 } },
    { new: true }
  ).select(`${countField} firstName`);

  if (!runner) {
    console.warn(`[rejectionStrike] Runner ${runnerId} not found`);
    return;
  }

  const count = runner[countField];
  logger.info(`[rejectionStrike] Runner ${runner.firstName} (${runnerId}) now has ${count} ${countField} strike(s)`);

  if (count >= 3) {
    logger.info(`[rejectionStrike] Runner ${runner.firstName} has reached ${count} ${countField} strikes — BANNING`);

    await Runner.findByIdAndUpdate(runnerId, {
      kycStatus: 'banned',
      isOnline: false,
      isAvailable: false,
      isActive: false,
    });

    const activeOrder = await Order.findOne({
      chatId,
      status: { $nin: ['completed', 'cancelled', 'task_completed'] }
    }).sort({ createdAt: -1 });

    // ── hoist refundAmount so push notification can access it ─────────────
    let refundAmount = 0;

    if (activeOrder) {
      await Order.findByIdAndUpdate(activeOrder._id, { status: 'cancelled' });

      if (activeOrder.escrowId) {
        try {
          const escrow = await Escrow.findById(activeOrder.escrowId);
          if (escrow && escrow.status !== 'released') {
            const isRunErrand =
              activeOrder.serviceType === 'run-errand' ||
              activeOrder.serviceType === 'run_errand';

            // TODO: confirm with PM — should platform fee be refunded too on ban?
            // Currently: delivery fee only for errand (item budget gone to vendor)
            // full refund for pickup (nothing spent)
            refundAmount = isRunErrand ? escrow.deliveryFee : escrow.totalAmount;

            await paymentService.refundToUser({
              escrowId: escrow._id,
              userId: activeOrder.userId,
              amount: refundAmount,
              reason: `Runner banned after ${count} violations — order ${activeOrder.orderId}`,
              orderId: activeOrder.orderId,
            });

            logger.info(`[rejectionStrike] Refunded NGN ${refundAmount} to user for order ${activeOrder.orderId}`);
          }
        } catch (err) {
          logger.error('[rejectionStrike] Refund failed:', err.message);
        }
      }

      const userId = activeOrder.userId?.toString();

      const userMsg = {
        id: `runner-banned-user-${Date.now()}`,
        from: 'system', type: 'system', messageType: 'system',
        text: `This runner has been banned after ${count} violations. Your order has been cancelled and a refund of NGN ${refundAmount.toLocaleString()} has been processed to your wallet.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent', senderId: 'system', senderType: 'system', style: 'error',
      };

      const runnerMsg = {
        id: `runner-banned-runner-${Date.now() + 1}`,
        from: 'system', type: 'system', messageType: 'system',
        text: `Your account has been banned after ${count} violations. This order has been cancelled.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent', senderId: 'system', senderType: 'system', style: 'error',
      };

      await persistMessages(chatId, [userMsg, runnerMsg]);
      io.to(chatId).emit('message', userMsg);
      io.to(chatId).emit('message', runnerMsg);

      if (userId) {
        io.to(`user-${userId}`).emit('orderCancelled', {
          orderId: activeOrder.orderId,
          cancelledBy: 'system',
          reason: 'Runner banned',
        });
      }

      io.to(`runner-${runnerId}`).emit('orderCancelled', {
        orderId: activeOrder.orderId,
        cancelledBy: 'system',
      });

      // push notification
      await Promise.allSettled([
        sendPushNotification({
          recipientId: activeOrder.userId,
          recipientType: 'user',
          title: 'Refund Processed',
          body: refundAmount > 0
            ? `NGN ${refundAmount.toLocaleString()} has been refunded to your wallet. We apologise for the inconvenience.`
            : 'Your order has been cancelled. We apologise for the inconvenience.',
          data: { type: 'refund_processed', orderId: activeOrder.orderId },
        }),

        sendPushNotification({
          recipientId: runnerId,
          recipientType: 'runner',
          title: 'Account Banned',
          body: 'Your account has been banned due to repeated violations.',
          data: { type: 'account_banned' },
        }),
      ]);

      logger.info(`[rejectionStrike] Order ${activeOrder.orderId} cancelled, user notified`);
    }

    // emit ban event regardless of whether there was an active order
    io.to(`runner-${runnerId.toString()}`).emit('verificationStatus', {
      isBanned: true,
      reason: 'Your account has been banned due to repeated item or delivery rejections.',
    });
  }
};

module.exports = { handleRejectionStrike };