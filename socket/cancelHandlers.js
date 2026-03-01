const Order = require('../models/Order');
const Runner = require('../models/Runner');
const User = require('../models/User');
const { Chat } = require('../models/Chat');
const { logSocketAudit } = require('../utils/socketAudit');
const logger = require('../utils/logger');

// Remove runner from the in-memory service pool
const { runnersByService } = require('./socketHandlers');

const handleCancelOrder = async (socket, io, data) => {
    const { chatId, orderId, runnerId, userId } = data;

    try {
        logger.info('Order Cancelled:', { chatId, orderId, runnerId, userId });
        const order = await Order.findOne({ orderId: orderId || undefined, chatId });

        if (!order) {
            socket.emit('cancelOrderError', { message: 'Order not found' });
            return;
        }

        // Block cancellation if already paid
        if (order.paymentStatus === 'paid') {
            socket.emit('cancelOrderError', {
                message: 'This order has already been funded and cannot be cancelled. Please raise a dispute instead.'
            });
            return;
        }

        // Update order
        order.status = 'cancelled';
        order.cancelledBy = 'runner';
        order.cancelledAt = new Date();
        order.cancellationReason = 'Runner cancelled before payment';
        order.statusHistory.push({
            status: 'cancelled',
            timestamp: new Date(),
            triggeredBy: 'runner',
            note: 'Cancelled by runner before payment'
        });
        await order.save();

        // Set runner and user available
        await Runner.findByIdAndUpdate(runnerId, {
            isAvailable: true,
            activeOrderId: null,
            currentUserId: null,
        });

        await User.findByIdAndUpdate(userId, {
            isAvailable: true,
            activeOrderId: null,
            currentRunnerId: null,
        });

        // Clear user's currentRequest so they can start fresh
        await User.findByIdAndUpdate(userId, {
            $unset: { currentRequest: '' }
        });

        // Remove runner from service pool
        if (order.serviceType && runnersByService[order.serviceType]) {
            runnersByService[order.serviceType].delete(socket.id);
        }

        // System message to chat
        const cancelMessage = {
            id: `cancel-${Date.now()}`,
            from: 'system',
            type: 'system',
            messageType: 'system',
            text: 'Runner has cancelled the order.',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            senderId: 'system',
            senderType: 'system',
            status: 'sent',
        };

        await Chat.findOneAndUpdate(
            { chatId },
            { $push: { messages: cancelMessage } }
        );

        io.to(chatId).emit('orderCancelled', {
            orderId: order.orderId,
            chatId,
            message: 'Runner has cancelled the order.',
            cancelledBy: 'runner',
        });

        io.to(chatId).emit('message', cancelMessage);

        // Remove both from chat room
        const room = io.sockets.adapter.rooms.get(chatId);
        if (room) {
            for (const socketId of room) {
                const s = io.sockets.sockets.get(socketId);
                if (s) s.leave(chatId);
            }
        }

        logSocketAudit('ORDER_CANCELLED', {
            orderId: order.orderId,
            runnerId,
            userId,
            chatId,
            cancelledBy: 'runner',
        });
        console.log(`Order ${order.orderId} cancelled by runner ${runnerId}`);

    } catch (error) {
        logger.error('Falied to cancel Order', orderId);
        console.error('handleCancelOrder error:', error);
        socket.emit('cancelOrderError', { message: 'Failed to cancel order. Please try again.' });
    }
};

const handleTaskCompleted = async (io, data) => {
    const { chatId, orderId, runnerId, userId } = data;

    try {
        logger.info('Task Completed:', { chatId, orderId, runnerId, userId });
        // Set runner and user available
        await Runner.findByIdAndUpdate(runnerId, {
            isAvailable: true,
            activeOrderId: null,
            currentUserId: null,
        });

        await User.findByIdAndUpdate(userId, {
            isAvailable: true,
            activeOrderId: null,
            currentRunnerId: null,
        });

        // Clear user's currentRequest
        await User.findByIdAndUpdate(userId, {
            $unset: { currentRequest: '' }
        });

        // Remove runner from service pool
        const room = io.sockets.adapter.rooms.get(chatId);
        if (room) {
            for (const socketId of room) {
                const s = io.sockets.sockets.get(socketId);
                if (s) {
                    // Remove from service pool if runner socket
                    if (s.runnerId && s.serviceType && runnersByService[s.serviceType]) {
                        runnersByService[s.serviceType].delete(socketId);
                    }
                    s.leave(chatId);
                }
            }
        }

        console.log(`Task ${orderId} completed. Runner ${runnerId} and user ${userId} freed.`);

    } catch (error) {
        logger.info('Order or chatId not found', { chatId, orderId, runnerId,});
        console.error('handleTaskCompleted error:', error);
    }
};

module.exports = { handleCancelOrder, handleTaskCompleted };