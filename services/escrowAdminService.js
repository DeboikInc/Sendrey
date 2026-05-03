const Escrow = require('../models/Escrows');
const Order = require('../models/Order');
const User = require('../models/User');
const Runner = require('../models/Runner')
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');
const emailService = require('./emailService');
const LedgerEntry = require('../models/LedgerEntry');

class EscrowAdminService {

    /**
     * Fetch all funded escrows whose linked order has been cancelled.
     * Also returns recently refunded escrows for audit trail.
     */
    async getCancelledEscrows({ page = 1, limit = 20 } = {}) {
        const skip = (page - 1) * limit;

        const cancelledOrders = await Order.find({ status: 'cancelled' })
            .select('_id orderId')
            .lean();

        const cancelledOrderIds = cancelledOrders.map(o => o._id);

        const query = {
            orderId: { $in: cancelledOrderIds },
            status: { $in: ['funded', 'pending'] },
        };

        const [escrows, total] = await Promise.all([
            Escrow.find(query)
                .populate('userId', 'firstName lastName email phone')
                .populate('runnerId', 'firstName lastName email phone')
                .populate('orderId', 'orderId status cancellationReason cancelledAt cancelledBy')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Escrow.countDocuments(query),
        ]);

        const refunded = await Escrow.find({
            orderId: { $in: cancelledOrderIds },
            status: 'refunded',
        })
            .populate('userId', 'firstName lastName email phone')
            .populate('orderId', 'orderId status')
            .sort({ updatedAt: -1 })
            .limit(10)
            .lean();

        return {
            escrows,
            refunded,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
        };
    }

    /**
     * Fetch a single escrow by ID with full population.
     */
    async getEscrowById(escrowId) {
        const escrow = await Escrow.findById(escrowId)
            .populate('userId', 'firstName lastName email phone')
            .populate('runnerId', 'firstName lastName email phone')
            .populate('orderId')
            .lean();

        if (!escrow) throw new Error('Escrow not found');
        return escrow;
    }

    /**
     * Refund escrow total amount to the user's Wallet document.
     * Uses wallet.credit() which also creates a Transaction record.
     */

    async refundToWallet(escrowId, adminId, reason = 'Order cancelled — refund issued by admin') {
        // refundTarget: 'user' | 'runner'

        const escrow = await Escrow.findById(escrowId)
            .populate('userId', 'firstName lastName email')
            .populate('runnerId', 'firstName lastName email')
            .populate('orderId', 'orderId status');

        if (!escrow) throw new Error('Escrow not found');
        if (escrow.status === 'refunded') throw new Error('This escrow has already been refunded');
        if (!['funded', 'pending'].includes(escrow.status)) {
            throw new Error(`Cannot refund escrow with status: ${escrow.status}`);
        }

        const disputeRaisedBy = escrow.orderId?.disputeRaisedBy;
        if (!disputeRaisedBy) throw new Error('Cannot determine dispute origin — disputeRaisedBy missing on order');

        const isRunner = refundTarget === 'runner';

        const recipientId = isRunner ? (escrow.runnerId._id || escrow.runnerId) : (escrow.userId._id || escrow.userId);
        const recipientModel = isRunner ? 'Runner' : 'User';
        const recipientName = isRunner
            ? `${escrow.runnerId.firstName} ${escrow.runnerId.lastName}`
            : `${escrow.userId.firstName} ${escrow.userId.lastName}`;
        const recipientEmail = isRunner ? escrow.runnerId.email : escrow.userId.email;

        const refundAmount = isRunner ? escrow.runnerPayout : escrow.totalAmount;

        // Find the right wallet
        const wallet = await Wallet.findOne({
            userId: recipientId,
            userType: isRunner ? 'runner' : 'user',
        });

        if (!wallet) throw new Error(`No wallet found for ${recipientModel.toLowerCase()} ${recipientId}`);
        if (wallet.status !== 'active') throw new Error(`${recipientModel} wallet is ${wallet.status} — cannot process refund`);

        const orderRef = escrow.orderId?.orderId || escrow.taskId || escrow._id.toString();

        await wallet.credit(
            refundAmount,
            `REFUND-${escrow._id}-${refundTarget.toUpperCase()}`,
            {
                type: 'escrow_refund',
                escrowId: escrow._id,
                orderId: escrow.orderId?._id || escrow.orderId,
                reason,
                refundedBy: adminId,
            }
        );

        await LedgerEntry.create({
            userId: recipientId.toString(),
            userModel: recipientModel,
            type: 'escrow_refund',
            grossAmount: refundAmount,
            netAmount: refundAmount,
            providerFee: 0,
            provider: 'system',
            orderId: orderRef,
            escrowId: escrow._id,
            description: `Admin resolved dispute for order ${orderRef} — ${reason}`,
            status: 'completed',
        });

        escrow.status = 'refunded';
        escrow.metadata = {
            ...escrow.metadata,
            refundedAt: new Date(),
            refundedBy: adminId,
            refundReason: reason,
            refundAmount,
            refundedTo: refundTarget,
            walletId: wallet._id,
            walletBalanceAfter: wallet.balance,
        };
        await escrow.save();

        logger.info(
            `Admin ${adminId} refunded NGN${refundAmount.toString()} to ${recipientModel} wallet ${wallet._id} ` +
            `(${recipientId}) for escrow ${escrowId}`
        );

        // Notify by email — non-blocking, add in service
        try {
            const Model = isRunner ? Runner : User;
            const recipient = await Model.findById(recipientId).select('firstName lastName email').lean();
            if (recipient) await emailService.sendRefundNotification(recipient, escrow);
        } catch (emailErr) {
            logger.error('Refund notification email failed:', emailErr.message);
        }

        return {
            escrowId: escrow._id,
            refundAmount,
            refundTarget,
            walletBalance: wallet.balance,
            escrowStatus: escrow.status,
            recipient: {
                _id: recipientId,
                model: recipientModel,
                firstName: isRunner ? escrow.runnerId.firstName : escrow.userId.firstName,
                lastName: isRunner ? escrow.runnerId.lastName : escrow.userId.lastName,
                email: recipientEmail,
            },
        };
    }
}

module.exports = new EscrowAdminService();