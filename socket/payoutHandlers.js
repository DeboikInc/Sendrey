/**
 * payoutHandlers.js - Socket handlers for runner payout flow
 */

const { Chat } = require('../models/Chat');
const Order = require('../models/Order');
const RunnerPayout = require('../models/RunnerPayout');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');
const { logSocketAudit } = require('../utils/socketAudit');
const paymentService = require('../services/paymentServices');

const uploadToCloudinary = (base64String, folder = 'payout-receipts') =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      base64String,
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
  });

/**
 * Runner fetches their payout record
 * Queries by chatId on RunnerPayout directly (not via Order lookup)
 * — avoids Order.chatId field mismatch issues
 */
const handleGetRunnerPayout = async (socket, io, data) => {
  try {
    const { chatId, runnerId } = data;

    if (!chatId) return socket.emit('runnerPayoutData', { payout: null });

    console.log('QUERY chatId:', JSON.stringify(chatId));
    console.log('QUERY runnerId:', JSON.stringify(runnerId));
    
    console.log('Looking for payout with chatId:', chatId);
    const allPayouts = await RunnerPayout.find({ runnerId }).lean();
    console.log('All payouts for runner:', allPayouts.map(p => ({ orderId: p.orderId, chatId: p.chatId, itemBudget: p.itemBudget })));

    // Query RunnerPayout directly by chatId — created in handlePaymentSuccess
    let payout = await RunnerPayout.findOne({ chatId }).lean();

    // Fallback: try via Order lookup in case chatId is stored on Order differently
    if (!payout) {
      const order = await Order.findOne({
        $or: [
          { chatId },
          { chatId: chatId.replace(/^chat-/, '') }, // strip prefix if any
        ]
      });
      if (order) {
        payout = await RunnerPayout.findOne({ orderId: order.orderId }).lean();
      }
    }

    logSocketAudit('GET_RUNNER_PAYOUT', {
      runnerId: data.runnerId,
      chatId: data.chatId,
    });
    logger.info(`getRunnerPayout | chatId=${chatId} | found=${!!payout} | orderId=${payout?.orderId}`);
    socket.emit('runnerPayoutData', { payout: payout || null });
    logger.info(`getRunnerPayout | chatId=${chatId} | found=${!!payout} | orderId=${payout?.orderId} | itemBudget=${payout?.itemBudget} | usedPayoutSystem=${payout?.usedPayoutSystem}`);

  } catch (err) {
    logger.error('handleGetRunnerPayout error:', err);
    socket.emit('error', { message: 'Failed to fetch payout data' });
  }
};

/**
 * Runner submits receipt after shopping
 * Sets usedPayoutSystem = true → unlocks runner fee at task_completed
 */
const handleSubmitPayoutReceipt = async (socket, io, data) => {
  try {
    const {
      orderId, runnerId, userId, chatId,
      vendorName, amountSpent, changeAmount,
      bankName, accountNumber, accountName,
      receiptBase64,
    } = data;

    let receiptUrl = null;
    if (receiptBase64) {
      const uploaded = await uploadToCloudinary(receiptBase64, 'payout-receipts');
      receiptUrl = uploaded.secure_url;
    }

    const submissionId = `payout-receipt-${Date.now()}`;

    const receiptEntry = {
      submissionId,
      receiptUrl,
      vendorName,
      amountSpent,
      changeAmount,
      bankDetails: {
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        accountName: accountName || null,
      },
      submittedAt: new Date(),
      status: 'pending',
    };

    // Update payout record — save top-level fields AND push to history
    const payout = await RunnerPayout.findOneAndUpdate(
      { orderId },
      {
        $set: {
          status: 'submitted',
          usedPayoutSystem: true,
          submittedAt: new Date(),
          vendorName,
          amountSpent,
          changeAmount,
          receiptUrl,
          'bankDetails.bankName': bankName || null,
          'bankDetails.accountNumber': accountNumber || null,
          'bankDetails.accountName': accountName || null,
        },
        $push: { receiptHistory: receiptEntry },
      },
      { new: true }
    );

    if (!payout) {
      return socket.emit('error', { message: 'Payout record not found' });
    }

    logger.info(`submitPayoutReceipt | orderId=${orderId} | vendor=${vendorName} | amount=₦${amountSpent}`);

    socket.emit('payoutReceiptSuccess', {
      submissionId,
      status: 'submitted',
      usedPayoutSystem: true,
      receiptUrl,
      message: 'Receipt saved.',
    });

    io.to(`runner-${runnerId}`).emit('payoutReceiptSubmitted', {
      orderId,
      usedPayoutSystem: true,
    });

  } catch (err) {
    logger.error('handleSubmitPayoutReceipt error:', err);
    socket.emit('error', { message: err.message || 'Failed to submit receipt' });
  }
};

/**
 * Called from handleApproveItems after user approves
 */
const handlePayoutApproved = async (orderId) => {
  try {
    const payout = await RunnerPayout.findOneAndUpdate(
      { orderId },
      { $set: { status: 'approved', approvedAt: new Date() } },
      { new: true }
    );
    if (payout) logger.info(`RunnerPayout approved | orderId=${orderId} | usedPayoutSystem=${payout.usedPayoutSystem}`);
  } catch (err) {
    logger.error('handlePayoutApproved error:', err);
  }
};

module.exports = { handleGetRunnerPayout, handleSubmitPayoutReceipt, handlePayoutApproved };