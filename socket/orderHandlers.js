// orderHandlers.js
const Order = require('../models/Order');
const User = require('../models/User');
const Runner = require('../models/Runner');
const { logSocketAudit } = require('../utils/socketAudit');

// ─── handleRunnerAccept ───────────────────────────────────────────────────────
//
// Called alongside handleAcceptRunnerRequest (in server.js) when a runner taps Accept.
//
// Responsibilities:
//   1. Cancel any stale unpaid / non-terminal orders for this chat so there is
//      no zombie order lying around when the new session initialises.
//   2. Cross-link runner ↔ user on their documents so both know who they are
//      paired with before the chat room is initialised.
//
// NOTE: Order *creation* is intentionally NOT done here.
//       createOrder() in socketHandlers.js is the single source of truth for
//       that — it is called inside handleUserJoinChat (CASE C) once both parties
//       have confirmed they are in the chat room.
//
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

module.exports = { handleRunnerAccept };