const Order = require('../models/Order');
const Runner = require('../models/Runner');
const Escrow = require('../models/Escrows');
const User = require('../models/User');
const { Chat } = require('../models/Chat');
const { logSocketAudit } = require('../utils/socketAudit');
const logger = require('../utils/logger');
const { archiveCurrentSession } = require('./socketHandlers');
const paymentService = require('../services/paymentServices');
const locationStore = require('../services/locationTracking/locationStore');
const { arrivedAtSourceSet, arrivedAtDeliverySet } = require('./trackingHandlers');
const { stampMessage } = require('./messageHandlers');
const { notifyAutoConfirmWarning } = require('../services/notificationService');
const orderStateMachine = require('../services/orderStateMachine');

// Remove runner from the in-memory service pool
const { runnersByService } = require('./socketHandlers');
const { cancelOrder } = require('../services/orderService');

const {
    notifyRatingPrompt,
    notifyDeliveryConfirmed,
    notifyOrderCancelled
} = require('../services/notificationService');

const handleCancelOrder = async (socket, io, data) => {
    const { chatId, orderId, runnerId, userId, reason } = data;
    try {
        const { order, cancelMessage } = await cancelOrder({
            orderId, chatId, runnerId, userId, reason, cancelledBy: 'runner'
        });

        const now = new Date().toISOString();
        const reasonSuffix = reason ? ` Reason: ${reason}` : '';

        // to runner
        const runnerMessage = {
            id: `cancel-runner-${Date.now()}`,
            chatId,
            text: `You cancelled this order.${reasonSuffix}`,
            type: 'system',
            from: 'system',
            senderId: 'system',
            senderType: 'system',
            createdAt: now,
        };

        // fetch runner name for a personal touch
        const runner = await Runner.findById(runnerId).select('firstName lastName').lean();
        const runnerName = runner
            ? `${runner.firstName}${runner.lastName ? ' ' + runner.lastName : ''}`
            : 'Your runner';

        const userMessage = {
            id: `cancel-user-${Date.now()}`,
            chatId,
            text: `${runnerName} cancelled this order.${reasonSuffix}`,
            type: 'system',
            from: 'system',
            senderId: 'system',
            senderType: 'system',
            createdAt: now,
        };

        // Emit orderCancelled to the whole room (both need to know to clear state)
        // but send the personalised system message to each private room
        io.to(chatId).emit('orderCancelled', {
            orderId: order.orderId,
            chatId,
            message: cancelMessage.text,
            cancelledBy: 'runner',
            clearChat: true,
            // give each side their own message so their client can display it
            runnerMessage,
            userMessage,
        });

        notifyOrderCancelled(userId, {
            orderId: order.orderId,
            cancelledBy: 'runner',
            runnerName,
            reason,
        }).catch(err => console.warn('[cancelOrder] User notify failed:', err.message));

        io.to(`runner-${runnerId}`).emit('message', runnerMessage);
        io.to(`user-${userId}`).emit('message', userMessage);

        // Slow ops fire-and-forget
        Promise.all([
            Runner.findByIdAndUpdate(runnerId, { isAvailable: true, activeOrderId: null, currentUserId: null }),
            User.findByIdAndUpdate(userId, { isAvailable: true, activeOrderId: null, currentRunnerId: null }),
            Chat.findOneAndUpdate({ chatId }, { $set: { lastActivity: new Date() } }),
            archiveCurrentSession(chatId, orderId, 'cancelled'),
        ]).catch(err => logger.error('handleCancelOrder post-emit ops failed:', err));

        if (order.serviceType && runnersByService[order.serviceType]) {
            runnersByService[order.serviceType].delete(socket.id);
        }

        const room = io.sockets.adapter.rooms.get(chatId);
        if (room) {
            for (const socketId of room) {
                const s = io.sockets.sockets.get(socketId);
                if (s) s.leave(chatId);
            }
        }

        // clean up location tracking
        try {
            await locationStore.removeLocation(orderId);
            arrivedAtSourceSet.delete(orderId);
            arrivedAtDeliverySet.delete(orderId);

            io.to(`tracking:${orderId}`).emit('runner:offline', { orderId });
            logger.info(`[taskCompleted] Cleared tracking for order ${orderId}`);
        } catch (error) {
            logger.warn('[taskCompleted] Tracking cleanup failed:', err.message);
        }

    } catch (error) {
        const msg = error.message === 'PAID_ORDER'
            ? 'This order has already been funded and cannot be cancelled.'
            : 'Failed to cancel order. Please try again.';
        socket.emit('cancelOrderError', { message: msg });
    }
};


const handleTaskCompleted = async (io, data) => {
    const { chatId, orderId, runnerId, userId } = data;

    const emitTaskCompleted = () => {
        io.to(chatId).emit('task_completed', { orderId, chatId, runnerId, userId, clearChat: true });
        io.to(`user-${userId}`).emit('task_completed', { orderId, chatId, runnerId, userId, clearChat: true });
        io.to(`runner-${runnerId}`).emit('task_completed', { orderId, chatId, runnerId, userId, clearChat: true });
    };

    emitTaskCompleted();

    const MAX_ATTEMPTS = 3;
    let attempt = 0;

    try {
        const order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
        if (!order) return;

        logger.info('Task Completed:', { chatId, orderId, runnerId, userId });
        let escrowId = order?.escrowId;
        if (!escrowId) {
            const escrow = await Escrow.findOne({ taskId: orderId }).lean();
            if (escrow) {
                escrowId = escrow._id;
                await Order.findOneAndUpdate({ orderId }, { $set: { escrowId: escrow._id } });
                logger.warn(`handleTaskCompleted: patched missing escrowId for order ${orderId}`);
            } else {
                logger.warn(`handleTaskCompleted: no escrow found for order ${orderId} — payout skipped`);
            }
        }

        await Runner.findByIdAndUpdate(runnerId, {
            itemRejectionCount: 0,
            deliveryDenialCount: 0,
        });
        console.log(`[taskCompleted] Reset strikes for runner ${runnerId}`);

        if (escrowId) {
            try {
                const result = await paymentService.payoutToRunner(escrowId);
                logger.info(`✅ Runner paid | orderId=${orderId} | payout=₦${result.runnerPayout} | usedPayoutSystem=${result.usedPayoutSystem}`);
            } catch (err) {
                // Don't block task completion if payout fails
                logger.error(`payoutToRunner failed for order ${orderId}: ${err?.message ?? String(err)}`);
                // logger.error(`payoutToRunner stack: ${err?.stack ?? 'no stack'}`);
            }
        } else {
            logger.warn(`handleTaskCompleted: no escrowId on order ${orderId} — payout skipped`);
        }

        // transition order to completed
        try {
            const orderStateMachine = require('../services/orderStateMachine');
            await orderStateMachine.transition(orderId, 'completed', {
                triggeredBy: 'system',
                note: 'Task completed by runner',
            });
        } catch (err) {
            // Already completed via delivery confirmation — safe to ignore
            logger.warn(`handleTaskCompleted: state transition skipped for ${orderId}: ${err.message}`);
        }

        // Set runner and user available
        await Runner.findByIdAndUpdate(runnerId, {
            isAvailable: true,
            activeOrderId: null,
            currentUserId: null,
            $inc: { completedOrders: 1, totalRuns: 1 }
        });

        await User.findByIdAndUpdate(userId, {
            isAvailable: true,
            activeOrderId: null,
            currentRunnerId: null,
            $unset: { currentRequest: '' }
        });

        await Chat.findOneAndUpdate(
            { chatId },
            { $set: { lastActivity: new Date() } }
            // Don't wipe messages — runner/user may want to browse completed chat
        );

        await Order.updateMany(
            { chatId, paymentStatus: 'unpaid', status: { $nin: ['completed', 'cancelled', 'task_completed'] }, orderId: { $ne: orderId } },
            { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'task_completed_new_order_started' } }
        );

        // Archive session on completion
        await archiveCurrentSession(chatId, orderId, 'completed');

        const chat = await Chat.findOne({ chatId });
        console.log(`[TaskCompleted] Final messages in chat:`, chat?.messages.map(m => ({ id: m.id, type: m.type, text: m.text?.slice(0, 50) })));


        // Now clear the room
        const room = io.sockets.adapter.rooms.get(chatId);
        if (room) {
            for (const socketId of [...room]) { // spread to avoid mutation during iteration
                const s = io.sockets.sockets.get(socketId);
                if (s) {
                    if (s.runnerId && s.serviceType && runnersByService[s.serviceType]) {
                        runnersByService[s.serviceType].delete(socketId);
                    }
                    s.leave(chatId);
                }
            }
        }

        logger.info(`Task ${orderId} completed. Runner ${runnerId} and user ${userId} freed. Chat cleared for fresh start.`);

        // send push notifiactions
        Runner.findById(runnerId).select('firstName lastName').then(async (runner) => {
            const runnerName = [runner?.firstName, runner?.lastName].filter(Boolean).join(' ');

            // Get order for payout amount
            const completedOrder = await Order.findOne({ orderId }).lean();

            notifyRatingPrompt(userId, {
                orderId,
                runnerName,
            }).catch(err => console.warn('[taskCompleted] Rating notify failed:', err.message));

            notifyDeliveryConfirmed(runnerId, {
                orderId,
                amount: completedOrder?.runnerPayout,
            }).catch(err => console.warn('[taskCompleted] Runner delivery notify failed:', err.message));

        }).catch(err => console.warn('[taskCompleted] Runner fetch for notify failed:', err.message));

        try {
            await locationStore.removeLocation(orderId);
            arrivedAtSourceSet.delete(orderId);
            arrivedAtDeliverySet.delete(orderId);

            io.to(`tracking:${orderId}`).emit('runner:offline', { orderId });
            logger.info(`[taskCompleted] Cleared tracking for order ${orderId}`);
        } catch (error) {
            logger.warn('[taskCompleted] Tracking cleanup failed:', err.message);
        }

    } catch (error) {
        logger.info('Order or chatId not found', { chatId, orderId, runnerId, });
        console.error('handleTaskCompleted error:', error);
    }
};

const handleRunnerStartedNewOrder = async (socket, data) => {
    const { runnerId, previousOrderId } = data;
    try {
        // Cancel any lingering unpaid orders for this runner
        await Order.updateMany(
            {
                runnerId,
                paymentStatus: { $ne: 'paid' },
                status: { $nin: ['completed', 'cancelled'] },
                ...(previousOrderId ? { orderId: { $ne: previousOrderId } } : {})
            },
            {
                $set: {
                    status: 'cancelled',
                    cancelledBy: 'system',
                    cancelledAt: new Date(),
                    cancellationReason: 'Runner started new order',
                },
                $push: {
                    statusHistory: {
                        status: 'cancelled',
                        timestamp: new Date(),
                        triggeredBy: 'system',
                        note: 'Runner started new order — stale pending order auto-cancelled',
                    }
                }
            }
        );

        await Runner.findByIdAndUpdate(runnerId, {
            isAvailable: true,
            activeOrderId: null,
            currentUserId: null,
        });
    } catch (err) {
        logger.error('handleRunnerStartedNewOrder error:', err);
    }
};

const scheduleAutoConfirm = (io, chatId, orderId, escrowId) => {
    const AUTO_CONFIRM_DELAY = 4 * 60 * 60 * 1000;
    const WARNING_BEFORE = 10 * 60 * 1000;
    const WARNING_DELAY = AUTO_CONFIRM_DELAY - WARNING_BEFORE;

    // 10-minute warning 
    setTimeout(async () => {
        try {
            const order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
            if (!order || order.deliveryConfirmedAt || order.status !== 'delivered') return;

            const warningMessage = stampMessage(chatId, {
                id: `auto-confirm-warning-${Date.now()}`,
                from: 'system', type: 'system', messageType: 'system',
                text: 'Your order will be automatically marked as completed in 10 minutes if no action is taken.',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent', senderId: 'system', senderType: 'system', style: 'warning',
            });

            io.to(`user-${order.userId.toString()}`).emit('message', warningMessage);
            io.to(`user-${order.userId.toString()}`).emit('autoConfirmWarning', {
                orderId,
                minutesRemaining: 10,
            });

            Chat.findOneAndUpdate(
                { chatId },
                { $push: { messages: warningMessage } }
            ).catch(err => console.error('[autoConfirm] Warning persist failed:', err));

            notifyAutoConfirmWarning(order.userId, { orderId, minutesRemaining: 10 })
                .catch(err => console.warn('[autoConfirm] Warning push notify failed:', err.message));

        } catch (error) {
            console.error('[autoConfirm] Warning phase failed:', error);
        }
    }, WARNING_DELAY);

    // ── Full auto-confirm ────────────────────────────────────────────────────
    setTimeout(async () => {
        try {
            const order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
            if (!order || order.deliveryConfirmedAt || order.status !== 'delivered') return;

            await orderStateMachine.transition(orderId, 'completed', {
                triggeredBy: 'system',
                note: 'Auto-confirmed after 4 hours',
            });

            await Order.findByIdAndUpdate(order._id, {
                $set: {
                    deliveryConfirmedAt: new Date(),
                    deliveryConfirmedBy: 'system',
                },
            });

            if (escrowId) {
                const escrow = await Escrow.findById(escrowId);
                if (escrow && !escrow.deliveryFeeReleased) {
                    await paymentService.payoutToRunner(escrow._id);
                }
            }

            // Same resets as handleTaskCompleted
            await Runner.findByIdAndUpdate(order.runnerId, {
                isAvailable: true,
                activeOrderId: null,
                currentUserId: null,
                itemRejectionCount: 0,
                deliveryDenialCount: 0,
                $inc: { completedOrders: 1, totalRuns: 1 },
            });

            await User.findByIdAndUpdate(order.userId, {
                isAvailable: true,
                activeOrderId: null,
                currentRunnerId: null,
                $unset: { currentRequest: '' },
            });

            await Chat.findOneAndUpdate(
                { chatId },
                { $set: { lastActivity: new Date() } }
            );

            await archiveCurrentSession(chatId, orderId, 'completed');

            // Messages + emits
            const autoCompleteMessage = stampMessage(chatId, {
                id: `auto-confirm-${Date.now()}`,
                from: 'system', type: 'task_completed', messageType: 'task_completed',
                text: 'This order has been marked as completed because the user did not respond in time.',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent', senderId: 'system', senderType: 'system',
                orderId: order.orderId,
            });

            io.to(chatId).emit('message', autoCompleteMessage);
            io.to(chatId).emit('taskCompleted', { orderId, triggeredBy: 'system' });
            io.to(chatId).emit('deliveryAutoConfirmed', { orderId, status: 'completed' });

            Chat.findOneAndUpdate(
                { chatId },
                { $push: { messages: autoCompleteMessage } }
            ).catch(err => console.error('[autoConfirm] Chat persist failed:', err));

            // Clear room
            const room = io.sockets.adapter.rooms.get(chatId);
            if (room) {
                for (const socketId of [...room]) {
                    const s = io.sockets.sockets.get(socketId);
                    if (s) {
                        if (s.runnerId && s.serviceType && runnersByService[s.serviceType]) {
                            runnersByService[s.serviceType].delete(socketId);
                        }
                        s.leave(chatId);
                    }
                }
            }

            // Tracking cleanup
            try {
                await locationStore.removeLocation(orderId);
                arrivedAtSourceSet.delete(orderId);
                arrivedAtDeliverySet.delete(orderId);
                io.to(`tracking:${orderId}`).emit('runner:offline', { orderId });
            } catch (err) {
                logger.warn('[autoConfirm] Tracking cleanup failed:', err.message);
            }

            logSocketAudit('ORDER_AUTO_CONFIRM_DELIVERED', { chatId, orderId });

        } catch (error) {
            console.error('[autoConfirm] Failed:', error);
        }
    }, AUTO_CONFIRM_DELAY);
};

module.exports = { handleCancelOrder, handleTaskCompleted, handleRunnerStartedNewOrder, scheduleAutoConfirm };