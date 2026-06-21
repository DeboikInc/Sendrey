const Order = require('../models/Order');
const Escrow = require('../models/Escrows');
const Chat = require('../models/Chat').Chat;
const paymentService = require('../services/paymentServices');
const User = require('../models/User');
const Runner = require('../models/Runner');
const orderStateMachine = require('../services/orderStateMachine');
const { logSocketAudit } = require('../utils/socketAudit');
const { handleRejectionStrike } = require('../utils/handleRejectionStrike');
const { stampMessage } = require('./messageHandlers');
const {
    notifyDeliveryConfirmationRequest,
    notifyAutoConfirmWarning,
} = require('../services/notificationService');
const { scheduleAutoConfirm } = require('./terminalHandlers');

// ─── Helpers 

const makeErrorMsg = (id) => ({
    id: `error-${id}-${Date.now()}`,
    from: 'system', type: 'system', messageType: 'system',
    text: 'A server error occurred. Please try again.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'sent', senderId: 'system', senderType: 'system', style: 'error',
});

const persistMessages = async (chatId, messages) => {
    await Chat.findOneAndUpdate(
        { chatId },
        { $push: { messages: { $each: messages } } },
        { upsert: true }
    );
};

// ─── Runner marks delivery complete

const handleMarkDeliveryComplete = async (io, socket, data) => {
    const { chatId, orderId, runnerId, deliveryProof } = data;

    let order;

    try {
        const terminalStatuses = ['completed', 'cancelled', 'task_completed', 'archived', 'disputed', 'dispute_resolved'];

        order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
        console.log('[markDeliveryComplete] initial lookup:', order?.orderId, '| status:', order?.status, '| paymentStatus:', order?.paymentStatus);

        if (!order || terminalStatuses.includes(order?.status)) {
            console.log('[markDeliveryComplete] initial order is terminal or missing, searching by chatId:', chatId);

            const candidates = await Order.find({ chatId }).sort({ createdAt: -1 }).lean();
            console.log('[markDeliveryComplete] all orders for chatId:', candidates.map(o => ({
                orderId: o.orderId,
                status: o.status,
                paymentStatus: o.paymentStatus,
                deliveryConfirmedAt: o.deliveryConfirmedAt,
            })));

            order = candidates.find(o =>
                !terminalStatuses.includes(o.status) &&
                o.paymentStatus === 'paid'
            ) || null;

            console.log('[markDeliveryComplete] resolved order:', order?.orderId, '| status:', order?.status);
        }

        if (!order) return socket.emit('error', { message: 'No active order found' });

        if (order.paymentStatus !== 'paid') {
            return socket.emit('error', { message: 'Payment required before marking delivery complete' });
        }

        if (order.deliveryConfirmedAt) return socket.emit('error', { message: 'Delivery already confirmed by user' });
    } catch (err) {
        console.error('[markDeliveryComplete] Order lookup failed:', err);
        return socket.emit('error', { message: 'Failed to find order. Please try again.' });
    }


    // State transition + escrow update 
    try {
        const advanceToDelivered = async (currentStatus, resolvedOrderId) => {
            if (currentStatus === 'delivered') {
                // Already delivered — just ensure escrow and messages proceed
                return;
            }

            const steps = {
                'active': ['arrived_at_delivery', 'delivered'],
                'pending_payment': ['paid', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'paid': ['accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'accepted': ['en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'shopping': ['items_submitted', 'items_approved', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'items_submitted': ['items_approved', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'items_approved': ['en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'en_route_to_pickup': ['arrived_at_pickup', 'picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'arrived_at_pickup': ['picked_up', 'en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'picked_up': ['en_route_to_delivery', 'arrived_at_delivery', 'delivered'],
                'en_route_to_delivery': ['arrived_at_delivery', 'delivered'],
                'arrived_at_delivery': ['delivered'],
                'item_delivered': ['delivered'],
                'in_progress': ['delivered'],
            };

            const path = steps[currentStatus];
            if (!path) throw new Error(`Cannot advance to delivered from status: ${currentStatus}`);

            for (const step of path) {
                await orderStateMachine.transition(resolvedOrderId, step, {
                    triggeredBy: step === 'delivered' ? 'runner' : 'system',
                    triggeredById: step === 'delivered' ? runnerId : null,
                    note: step === 'delivered'
                        ? 'Runner marked as delivered'
                        : `Auto-progressed from ${currentStatus} to ${step}`,
                });
            }
        };

        await advanceToDelivered(order.status, order.orderId);


        if (order.escrowId) {
            await Escrow.findByIdAndUpdate(order.escrowId, { status: 'delivery_pending' });
        }

    } catch (err) {
        console.error('[markDeliveryComplete] State transition failed:', err);
        return socket.emit('error', { message: 'Failed to update order state. Please try again.' });
    }

    // Build messages 
    let runnerName = 'Runner';
    try {
        const runner = await Runner.findById(runnerId).select('firstName lastName');
        runnerName = [runner?.firstName, runner?.lastName].filter(Boolean).join(' ') || 'Runner';
    } catch (err) {
        console.warn('[markDeliveryComplete] Could not fetch runner name:', err.message);
    }

    const confirmationMessage = stampMessage(chatId, {
        id: `delivery-confirm-${Date.now()}`,
        from: 'system',
        type: 'delivery_confirmation_request',
        messageType: 'delivery_confirmation_request',
        text: 'Runner has marked delivery as complete. Please confirm delivery.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent', senderId: 'system', senderType: 'system',
        orderId: order.orderId,
        deliveryProof: deliveryProof || null,
        confirmationStatus: 'pending',
        runnerName,
    });

    const runnerAckMessage = stampMessage(chatId, {
        id: `delivery-marked-runner-${Date.now() + 1}`,
        from: 'system', type: 'system', messageType: 'system',
        text: 'You marked delivery as complete. Waiting for the user to confirm.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent', senderId: 'system', senderType: 'system',
    });

    // Emit immediately (optimistic)
    io.to(`user-${order.userId.toString()}`).emit('message', confirmationMessage);
    io.to(`runner-${runnerId.toString()}`).emit('message', runnerAckMessage);

    console.log('[markDeliveryComplete] about to emit deliveryMarkedComplete, order status:', order.status);
    socket.emit('deliveryMarkedComplete', { orderId: order.orderId, status: 'awaiting_confirmation' });
    socket.to(chatId).emit('deliveryMarkedComplete', { orderId: order.orderId, status: 'awaiting_confirmation' })

    // Persist to DB — recover on failure
    try {
        await persistMessages(chatId, [confirmationMessage, runnerAckMessage]);
    } catch (err) {
        console.error('[markDeliveryComplete] Chat persist failed:', err);

        logSocketAudit('DELIVERY_MARK_PERSIST_FAILED', { runnerId, chatId, orderId });

    }

    // Side effects (non-critical) 
    logSocketAudit('ORDER_DELIVERED', { runnerId, chatId, orderId });
    scheduleAutoConfirm(io, chatId, orderId, order.escrowId);

    notifyDeliveryConfirmationRequest(order.userId, { orderId: order.orderId })
        .catch(err => console.warn('[markDeliveryComplete] Push notify failed:', err.message));
};

// User confirms delivery 
const handleConfirmDelivery = async (io, socket, data) => {
    const { chatId, orderId, userId } = data;

    // Validate 
    let order;
    try {
        order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
        if (!order) return socket.emit('error', { message: 'Order not found' });
        if (order.deliveryConfirmedAt) return socket.emit('error', { message: 'Delivery already confirmed' });
    } catch (err) {
        console.error('[confirmDelivery] Order lookup failed:', err);
        return socket.emit('error', { message: 'Failed to find order. Please try again.' });
    }

    // Critical DB writes — must succeed before emit 
    // Payment is involved so write first here, then emit
    try {
        await orderStateMachine.transition(orderId, 'completed', {
            triggeredBy: 'user',
            triggeredById: userId,
            note: 'Delivery confirmed by user',
        });

        await Order.findByIdAndUpdate(order._id, {
            $set: {
                deliveryConfirmedAt: new Date(),
                deliveryConfirmedBy: 'user',
            },
        })

        await User.findByIdAndUpdate(userId, { activeOrderId: null, currentRunnerId: null });
        await Runner.findByIdAndUpdate(order.runnerId, { activeOrderId: null, currentUserId: null });
    } catch (err) {
        console.error('[confirmDelivery] Critical write failed:', err);
        return socket.emit('error', { message: 'Failed to confirm delivery. Please try again.' });
    }

    // Build messages 
    let userName = 'User';
    try {
        const user = await User.findById(userId).select('firstName lastName');
        userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
    } catch (err) {
        console.warn('[confirmDelivery] Could not fetch user name:', err.message);
    }

    const userSystemMsg = stampMessage(chatId, {
        id: `delivery-confirmed-user-${Date.now()}`,
        from: 'system', type: 'delivery_confirmation', messageType: 'delivery_confirmation',
        text: 'You confirmed delivery.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent', senderId: 'system', senderType: 'system',
    });

    const runnerSystemMsg = stampMessage(chatId, {
        id: `delivery-confirmed-runner-${Date.now() + 1}`,
        from: 'system', type: 'delivery_confirmation', messageType: 'delivery_confirmation',
        text: `${userName} confirmed the delivery of their item(s).`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent', senderId: 'system', senderType: 'system',
    });

    // Emit 
    io.to(chatId).emit('deliveryConfirmed', { orderId: order.orderId, status: 'completed' });

    io.to(`user-${userId}`).emit('message', userSystemMsg);
    io.to(`runner-${order.runnerId.toString()}`).emit('message', runnerSystemMsg);

    io.to(`tracking:${orderId}`).emit('runner:delivered', { orderId });

    // Prompt rating
    // io.to(`user-${userId}`).emit('promptRating', {
    //     orderId: order.orderId,
    //     runnerId: order.runnerId,
    // });

    // Persist chat messages (non-critical after payment) 
    persistMessages(chatId, [userSystemMsg, runnerSystemMsg])
        .catch(err => console.error('[confirmDelivery] Chat persist failed (payment already released):', err));

    //  Side effects 
    logSocketAudit('USER_CONFIRMED_ORDER_DELIVERED', { userId, chatId, orderId });

};

// User denies delivery 

const handleDenyDelivery = async (io, socket, data) => {
    const { chatId, orderId, userId } = data;

    // Validate
    let order;
    try {

        order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
        if (!order) return socket.emit('error', { message: 'Order not found' });
        if (order.deliveryConfirmedAt) return socket.emit('error', { message: 'Delivery already confirmed' });
    } catch (err) {
        console.error('[denyDelivery] Order lookup failed:', err);
        return socket.emit('error', { message: 'Failed to find order. Please try again.' });
    }

    // State revert 
    try {
        await orderStateMachine.transition(orderId, 'in_progress', {
            triggeredBy: 'user',
            triggeredById: userId,
            note: 'Delivery denied by user — reverted for runner retry',
        });

        if (order.escrowId) {
            await Escrow.findByIdAndUpdate(order.escrowId, { status: 'funded' });
        }
    } catch (err) {
        console.error('[denyDelivery] State revert failed:', err);
        return socket.emit('error', { message: 'Failed to process denial. Please try again.' });
    }


    let userName = 'User';
    try {
        const user = await User.findById(userId).select('firstName lastName');
        userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
    } catch (err) {
        console.warn('[denyDelivery] Could not fetch user name:', err.message);
    }

    const userSystemMsg = stampMessage(chatId, {
        id: `delivery-denied-user-${Date.now()}`,
        from: 'system', type: 'delivery_denied', messageType: 'delivery_denied',
        text: 'You reported that your item(s) were not delivered.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent', senderId: 'system', senderType: 'system', style: 'error',
    });

    const runnerSystemMsg = stampMessage(chatId, {
        id: `delivery-denied-runner-${Date.now() + 1}`,
        from: 'system', type: 'delivery_denied', messageType: 'delivery_denied',
        text: `${userName} denied the delivery of their item(s). Please ensure you deliver their order.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent', senderId: 'system', senderType: 'system', style: 'error',
    });

    io.to(chatId).emit('deliveryDenied', { orderId: order.orderId, status: 'denied' });
    io.to(`user-${userId}`).emit('message', userSystemMsg);
    io.to(`runner-${order.runnerId.toString()}`).emit('message', runnerSystemMsg);

    // Persist
    try {
        await persistMessages(chatId, [userSystemMsg, runnerSystemMsg]);
    } catch (err) {
        console.error('[denyDelivery] Chat persist failed:', err);
        // No rollback needed — order already reverted above, messages already emitted
    }

    // ban them after 3 tries
    const updatedRunner = await Runner.findByIdAndUpdate(
        order.runnerId,
        { $inc: { deliveryDenialCount: 1 } },
        { new: true }
    ).select('deliveryDenialCount');

    if (updatedRunner.deliveryDenialCount >= 3) {
        await handleRejectionStrike(io, order.runnerId.toString(), chatId, 'deliveryDenialCount');
    }

    logSocketAudit('USER_DENIED_ORDER_DELIVERED', { userId, chatId, orderId });
};


module.exports = {
    handleMarkDeliveryComplete,
    handleConfirmDelivery,
    handleDenyDelivery,
};
