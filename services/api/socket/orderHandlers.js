// orderHandlers.js
const Order = require('../models/Order');
const User = require('../models/User');
const Runner = require('../models/Runner');
const { logSocketAudit } = require('../utils/socketAudit');
const preRoomState = new Map();

const handleRunnerAccept = async (io, socket, data) => {
  try {
    const { runnerId, userId, chatId, serviceType } = data;

    // 1. Cancel any stale unpaid orders for this chat
    const cancelResult = await Order.updateMany(
      {
        chatId,
        paymentStatus: { $ne: 'paid' },
        status: { $nin: ['completed', 'cancelled', 'task_completed'] },
      },
      {
        $set: {
          status: 'cancelled',
          cancelledBy: 'system',
          cancelledAt: new Date(),
          cancellationReason: 'Superseded by new runner accept',
        },
        $push: {
          statusHistory: {
            status: 'cancelled',
            timestamp: new Date(),
            triggeredBy: 'system',
            note: 'Superseded by new order from runner re-accept',
          },
        },
      }
    );

    if (cancelResult.modifiedCount > 0) {
      console.log(`[handleRunnerAccept] Cancelled ${cancelResult.modifiedCount} stale order(s) for chat ${chatId}`);
    }

    // 2. Cross-link runner ↔ user
    await Promise.all([
      Runner.findByIdAndUpdate(runnerId, { currentUserId: userId }),
      User.findByIdAndUpdate(userId, { currentRunnerId: runnerId }),
    ]);

    logSocketAudit('RUNNER_ACCEPTED_ORDER', { runnerId, userId, serviceType, chatId });
  } catch (error) {
    console.error('[handleRunnerAccept] Error:', error);
    throw error;
  }
};

const releaseLockAndAbort = async (io, { chatId, userId, runnerId, reason }) => {
  try {
    await Promise.all([
      runnerId ? Runner.findByIdAndUpdate(runnerId, { isAvailable: true, activeOrderId: null }) : null,
      userId ? User.findByIdAndUpdate(userId, { isAvailable: true, activeOrderId: null }) : null,
    ]);
  } catch (err) {
    console.error('[releaseLockAndAbort] failed to reset availability:', err.message);
  }

  preRoomState.delete(chatId);

  const abortPayload = {
    chatId,
    code: 'ORDER_CREATE_FAILED',
    message: reason || 'This session could not be started. Please try again.',
  };

  if (userId) io.to(`user-${userId}`).emit('sessionAborted', abortPayload);
  if (runnerId) io.to(`runner-${runnerId}`).emit('sessionAborted', abortPayload);

  logSocketAudit('SESSION_ABORTED', { chatId, userId, runnerId, reason });
};

module.exports = { handleRunnerAccept, releaseLockAndAbort };