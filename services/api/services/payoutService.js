const RunnerPayout = require('../models/RunnerPayout');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const LedgerEntry = require('../models/LedgerEntry');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');
const pinService = require('./pinService');
const paymentService = require('./paymentServices');
const { withTransaction } = require('../utils/withTransaction');

const PAYOUT_ALLOWED_STATUSES = ['items_approved', 'purchase_in_progress', 'purchase_completed'];

const uploadToCloudinary = (base64String, folder = 'payout-receipts') =>
    new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            base64String,
            { folder, resource_type: 'image' },
            (err, result) => (err ? reject(err) : resolve(result))
        );
    });

class PayoutService {

    async getRunnerPayout(runnerId, { chatId, orderId }) {
        if (!chatId && !orderId) {
            const err = new Error('chatId or orderId required');
            err.statusCode = 400;
            throw err;
        }

        const order = chatId
            ? await Order.findOne({ chatId }).sort({ createdAt: -1 })
            : await Order.findOne({ orderId }).sort({ createdAt: -1 });

        if (!order) return { payout: null };

        const payout = await RunnerPayout.findOne({ orderId: order.orderId, runnerId }).lean();
        return { payout };
    }

    async getPayoutHistory(runnerId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [payouts, total] = await Promise.all([
            RunnerPayout.find({ runnerId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
            RunnerPayout.countDocuments({ runnerId }),
        ]);

        return { payouts, total, page: parseInt(page), limit: parseInt(limit) };
    }

    async getRunnerReceipts(runnerId) {
        const payouts = await RunnerPayout.find({
            runnerId,
            'receiptHistory.0': { $exists: true },
        })
            .select('orderId chatId vendorName amountSpent status receiptHistory createdAt')
            .sort({ createdAt: -1 })
            .lean();

        const receipts = payouts.flatMap(p =>
            p.receiptHistory.map(r => ({
                ...r,
                orderId: p.orderId,
                chatId: p.chatId,
                payoutStatus: p.status,
            }))
        );

        return { receipts, total: receipts.length };
    }

    async submitReceipt(runnerId, { chatId, vendorName, amountSpent, changeAmount, bankName, accountNumber, accountName, receiptBase64 }) {
        if (!chatId) {
            const err = new Error('chatId required');
            err.statusCode = 400;
            throw err;
        }

        const order = await Order.findOne({ chatId }).sort({ createdAt: -1 });
        if (!order) {
            const err = new Error('Order not found');
            err.statusCode = 404;
            throw err;
        }

        const payout = await RunnerPayout.findOne({ orderId: order.orderId, runnerId });
        if (!payout) {
            const err = new Error('Payout record not found');
            err.statusCode = 404;
            throw err;
        }

        let receiptUrl = null;
        if (receiptBase64) {
            const uploaded = await uploadToCloudinary(receiptBase64, 'payout-receipts');
            receiptUrl = uploaded.secure_url;
        }

        // Server is the source of truth for change, not the client-supplied value
        const spent = parseFloat(amountSpent) || 0;
        const change = Math.round((payout.itemBudget - spent) * 100) / 100;

        const receiptEntry = {
            receiptUrl,
            vendorName,
            amountSpent: spent,
            changeAmount: change,
            submittedAt: new Date(),
            status: 'pending',
        };

        payout.receiptHistory.push(receiptEntry);
        payout.vendorName = vendorName;
        payout.amountSpent = spent;
        payout.changeAmount = change;
        payout.receiptUrl = receiptUrl;
        payout.usedPayoutSystem = true;
        payout.status = 'submitted';
        payout.submittedAt = new Date();

        if (bankName || accountNumber || accountName) {
            payout.bankDetails = { bankName, accountNumber, accountName };
        }

        await payout.save();
        logger.info(`Receipt submitted: runner=${runnerId} order=${order.orderId} amount=NGN${spent.toString()}`);

        return {
            payoutId: payout._id,
            status: payout.status,
            receiptUrl,
            usedPayoutSystem: payout.usedPayoutSystem,
        };
    }

    async _rollbackWalletDeduction({ userId, orderId, spent }) {
        await withTransaction(async (session) => {
            const userWallet = await Wallet.findOne({ userId }).session(session);
            if (userWallet) {
                await Wallet.findOneAndUpdate(
                    { userId },
                    { $inc: { lockedBalance: spent } },
                    { session }
                );
            }

            const entryToReverse = await LedgerEntry.findOne({
                orderId, type: 'item_budget_spent', userId,
            }).session(session);
            if (entryToReverse) await LedgerEntry.reverse(entryToReverse._id, 'Transfer failed — wallet rollback');
        });
    }

    async _deductWalletForSpend({ userId, runnerId, orderId, vendorName, spent }) {
        await withTransaction(async (session) => {
            const userWallet = await Wallet.findOne({ userId }).session(session);
            if (!userWallet) throw new Error('User wallet not found');
            if (userWallet.lockedBalance < spent) throw new Error('Insufficient locked balance');

            await Wallet.findOneAndUpdate(
                { userId },
                { $inc: { lockedBalance: -spent } },
                { session }
            );

            await LedgerEntry.create([{
                userId,
                userModel: 'User',
                runnerId,
                type: 'item_budget_spent',
                grossAmount: spent,
                netAmount: spent,
                providerFee: 0,
                provider: 'paystack',
                orderId,
                description: `Item budget spent at ${vendorName} for order ${orderId}`,
                status: 'completed',
                balanceBefore: userWallet.lockedBalance,
                balanceAfter: userWallet.lockedBalance - spent,
                platformFee: 0,
                netPlatformFee: 0,
                runnerFee: 0,
            }], { session });
        });
    }

    // Refunds whatever of the budget wasn't spent, crediting the user's
    // main balance (not lockedBalance). `change` here is ALWAYS the
    // server-computed value (itemBudget - spent) — never trust a
    // client-supplied change figure for the actual money movement.
    async _refundUnspentBudget({ userId, runnerId, orderId, change }) {
        if (change <= 0) return;

        try {
            await withTransaction(async (session) => {
                const walletBefore = await Wallet.findOne({ userId }).session(session);
                if (!walletBefore) return;

                const safeDeduct = Math.min(change, walletBefore.lockedBalance ?? 0);

                await Wallet.findOneAndUpdate(
                    { userId },
                    { $inc: { lockedBalance: -safeDeduct } },
                    { session }
                );

                // credit() handles the _balance atomic increment
                await walletBefore.credit(
                    change,
                    `unspent-refund-${orderId}-${Date.now()}`,
                    { reason: 'unspent_item_budget', orderId }
                );

                const walletAfter = await Wallet.findOne({ userId }).session(session);

                await LedgerEntry.create([{
                    userId,
                    userModel: 'User',
                    runnerId,
                    type: 'escrow_refund',
                    grossAmount: change,
                    netAmount: change,
                    providerFee: 0,
                    
                    balanceBefore: walletBefore._balance,
                    balanceAfter: walletAfter?._balance ?? (walletBefore._balance + change),
                    platformFee: 0,
                    netPlatformFee: 0,
                    runnerFee: 0,
                    provider: 'system',
                    orderId,
                    description: `Change Returned from ${orderId}`,
                    status: 'completed',
                }], { session });
            });
        } catch (refundErr) {
            logger.error(
                `payoutService: unspent refund of NGN${change} FAILED for order ${orderId} ` +
                `after vendor transfer already succeeded — needs manual fix:`,
                refundErr
            );
        }
    }

    async transferToVendor({ orderId, vendorName, amountSpent, bankName, accountNumber, accountName, pin, currentUser }) {
        const order = await Order.findOne({ orderId }).sort({ createdAt: -1 }).lean();

        if (!order) { const err = new Error('Order not found'); err.statusCode = 404; throw err; }
        if (!orderId) { const err = new Error('orderId is required'); err.statusCode = 400; throw err; }
        if (!vendorName || !amountSpent) { const err = new Error('vendorName and amountSpent are required'); err.statusCode = 400; throw err; }
        if (!bankName || !accountNumber || !accountName) { const err = new Error('Bank details are required'); err.statusCode = 400; throw err; }
        if (!pin) { const err = new Error('PIN is required to authorise transfer'); err.statusCode = 400; throw err; }

        const { valid } = await pinService.verifyPin({ userId: currentUser._id, role: currentUser.role, pin });
        if (!valid) { const err = new Error('Incorrect PIN'); err.statusCode = 401; throw err; }

        const spent = parseFloat(amountSpent);

        // Atomic claim — prevent double submission
        const claimed = await RunnerPayout.findOneAndUpdate(
            { orderId, status: 'pending' },
            { $set: { status: 'processing' } },
            { new: true }
        );
        if (!claimed) { const err = new Error('Transfer already submitted or currently processing'); err.statusCode = 409; throw err; }

        // FIX: change is derived server-side from claimed.itemBudget, never
        // taken from the client's changeAmount — this is the single source
        // of truth used both for the actual refund and everything persisted.
        const change = Math.round((claimed.itemBudget - spent) * 100) / 100;

        if (!PAYOUT_ALLOWED_STATUSES.includes(order.status)) {
            await RunnerPayout.findOneAndUpdate({ orderId }, { $set: { status: 'pending' } });
            const err = new Error(
                order.status === 'items_approved'
                    ? 'Transfer cannot be made before items are being purchased.'
                    : 'Payout transfer is no longer available at this order stage.'
            );
            err.statusCode = 403;
            throw err;
        }

        if (spent > claimed.itemBudget) {
            await RunnerPayout.findOneAndUpdate({ orderId }, { $set: { status: 'pending' } });
            const err = new Error(`Amount NGN${spent.toString()} exceeds budget NGN${claimed.itemBudget.toString()}`);
            err.statusCode = 400;
            throw err;
        }

        if (!claimed.itemBudget || claimed.itemBudget <= 0) {
            await RunnerPayout.findOneAndUpdate({ orderId }, { $set: { status: 'pending' } });
            const err = new Error('No approved item budget found for this order.');
            err.statusCode = 400;
            throw err;
        }

        try {
            await this._deductWalletForSpend({
                userId: order.userId, runnerId: order.runnerId, orderId, vendorName, spent,
            });
        } catch (walletErr) {
            await RunnerPayout.findOneAndUpdate({ orderId }, { $set: { status: 'pending' } });
            logger.error('transferToVendor wallet deduction failed:', walletErr);
            const err = new Error(walletErr.message || 'Wallet deduction failed');
            err.statusCode = 400;
            throw err;
        }

        let transferResult;
        try {
            transferResult = await paymentService.transferToVendor({
                amount: spent, bankName, accountNumber, accountName,
                vendorName, orderId, runnerId: order.runnerId,
            });
        } catch (transferErr) {
            await this._rollbackWalletDeduction({ userId: order.userId, orderId, spent });
            await RunnerPayout.findOneAndUpdate({ orderId }, { $set: { status: 'pending' } });
            logger.error('transferToVendor threw:', transferErr.message);
            const err = new Error(transferErr.message || 'Transfer to vendor failed');
            err.statusCode = 400;
            throw err;
        }

        if (!transferResult.success) {
            await this._rollbackWalletDeduction({ userId: order.userId, orderId, spent });
            await RunnerPayout.findOneAndUpdate({ orderId }, { $set: { status: 'pending' } });

            const lowerErr = (transferResult.error || '').toLowerCase();
            const isAccountError = ['account', 'verification', 'invalid', 'not found', 'bank', 'recipient']
                .some(kw => lowerErr.includes(kw));

            const err = new Error(
                isAccountError
                    ? 'We could not verify the vendor account. Please check the account number and bank, then try again.'
                    : transferResult.error || 'Transfer to vendor failed'
            );
            err.statusCode = isAccountError ? 422 : 500;
            throw err;
        }

        await this._refundUnspentBudget({
            userId: order.userId, runnerId: order.runnerId, orderId, change,
        });

        const payout = await RunnerPayout.findOneAndUpdate(
            { orderId },
            {
                $set: {
                    vendorName, amountSpent: spent, changeAmount: change,
                    status: 'submitted', submittedAt: new Date(),
                    usedPayoutSystem: true,
                    bankDetails: { bankName, accountNumber, accountName },
                    transferReference: transferResult.reference,
                    transferId: transferResult.transferId,
                },
                $push: {
                    receiptHistory: {
                        vendorName, amountSpent: spent, changeAmount: change,
                        submittedAt: new Date(), status: 'pending',
                        bankDetails: { bankName, accountNumber, accountName },
                        transferReference: transferResult.reference,
                        transferId: transferResult.transferId,
                    },
                },
            },
            { new: true }
        );

        await Order.findOneAndUpdate({ orderId }, { $set: { usedPayoutSystem: true } });

        const newReceipt = payout.receiptHistory[payout.receiptHistory.length - 1];

        logger.info(`transferToVendor | orderId=${orderId} | vendor=${vendorName} | amount=NGN ${spent.toString()} | ref=${transferResult.reference}`);

        return {
            orderId: payout.orderId,
            status: payout.status,
            usedPayoutSystem: payout.usedPayoutSystem,
            vendorName: payout.vendorName,
            amountSpent: payout.amountSpent,
            changeAmount: payout.changeAmount,
            transferReference: transferResult.reference,
            receiptId: newReceipt._id,
        };
    }

    async adminGetAllReceipts({ status, runnerId, page = 1, limit = 20 }) {
        const skip = (page - 1) * limit;

        const query = { 'receiptHistory.0': { $exists: true } };
        if (status) query['receiptHistory.status'] = status;
        if (runnerId) query.runnerId = runnerId;

        const [payouts, total] = await Promise.all([
            RunnerPayout.find(query)
                .populate('runnerId', 'firstName lastName phone email avatar')
                .populate('userId', 'firstName lastName phone')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            RunnerPayout.countDocuments(query),
        ]);

        const receipts = payouts.flatMap(p =>
            p.receiptHistory.map(r => ({
                payoutId: p._id,
                receiptId: r.submissionId || r._id,
                receiptUrl: r.receiptUrl,
                vendorName: r.vendorName || p.vendorName,
                amountSpent: r.amountSpent || p.amountSpent,
                changeAmount: r.changeAmount || p.changeAmount,
                status: r.status,
                submittedAt: r.submittedAt,
                reviewedAt: r.reviewedAt,
                rejectionReason: r.rejectionReason,
                orderId: p.orderId,
                chatId: p.chatId,
                itemBudget: p.itemBudget,
                payoutStatus: p.status,
                runner: p.runnerId,
                user: p.userId,
                bankDetails: p.bankDetails,
            }))
        );

        return { receipts, total, page: parseInt(page), limit: parseInt(limit) };
    }

    async adminReviewReceipt({ payoutId, receiptId, action, rejectionReason, adminId }) {
        if (!['approve', 'reject'].includes(action)) {
            const err = new Error('action must be approve or reject');
            err.statusCode = 400;
            throw err;
        }

        const payout = await RunnerPayout.findById(payoutId);
        if (!payout) { const err = new Error('Payout not found'); err.statusCode = 404; throw err; }

        const receipt = payout.receiptHistory.id(receiptId);
        if (!receipt) { const err = new Error('Receipt not found'); err.statusCode = 404; throw err; }

        receipt.status = action === 'approve' ? 'approved' : 'rejected';
        receipt.reviewedAt = new Date();
        receipt.reviewedBy = adminId;
        if (action === 'reject') receipt.rejectionReason = rejectionReason || 'Rejected by admin';

        if (action === 'approve') {
            payout.status = 'approved';
            payout.approvedAt = new Date();
        }

        await payout.save();
        logger.info(`Admin ${action}d receipt ${receiptId} for payout ${payoutId}`);

        return { receipt, payoutStatus: payout.status };
    }

    async adminPayoutStats() {
        const [total, pending, submitted, approved, rejected] = await Promise.all([
            RunnerPayout.countDocuments(),
            RunnerPayout.countDocuments({ status: 'pending' }),
            RunnerPayout.countDocuments({ status: 'submitted' }),
            RunnerPayout.countDocuments({ status: 'approved' }),
            RunnerPayout.countDocuments({ status: 'rejected' }),
        ]);

        const [budgetResult] = await RunnerPayout.aggregate([
            { $group: { _id: null, total: { $sum: '$itemBudget' }, spent: { $sum: '$amountSpent' } } }
        ]);

        const totals = budgetResult || { total: 0, spent: 0 };

        return {
            counts: { total, pending, submitted, approved, rejected },
            amounts: {
                totalBudgetAllocated: totals.total,
                totalAmountSpent: totals.spent,
                totalChange: totals.total - totals.spent,
            },
        };
    }
}

module.exports = new PayoutService();