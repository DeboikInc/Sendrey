const Dispute = require('../models/Dispute');
const Escrow = require('../models/Escrows');
const Order = require('../models/Order');
const { Chat } = require('../models/Chat');
const cloudinary = require('../config/cloudinary');
const orderStateMachine = require('./orderStateMachine');
const { sendPushNotification } = require('./notificationService');
const Wallet = require('../models/Wallet');
const LedgerEntry = require('../models/LedgerEntry');
const Runner = require('../models/Runner');
const paymentService = require('./paymentServices');
const { withTransaction } = require('../utils/withTransaction');
const POST_COMPLETION_STATUSES = new Set(['task_completed', 'completed']);

const uploadEvidence = (base64String) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      base64String,
      { folder: 'dispute-evidence', resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
};

/**
 * Raise a dispute.
 */
const raiseDispute = async ({
  orderId,
  chatId,
  raisedBy,
  raisedById,
  reason,
  description,
  evidenceFiles,
}) => {
  const order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
  if (!order) throw new Error('Order not found');

  // Check for an existing open dispute
  const existingDispute = await Dispute.findOne({
    orderId,
    status: { $in: ['open', 'under_review'] },
  });
  if (existingDispute) throw new Error('A dispute already exists for this order');

  const isPostCompletion = POST_COMPLETION_STATUSES.has(order.status);

  // Resolve escrow
  let escrowId = order.escrowId || null;
  if (!escrowId) {
    const escrow = await Escrow.findOne({ orderId: order._id });
    escrowId = escrow?._id || null;
  }

  // Upload evidence
  const evidence = [];
  if (evidenceFiles?.length > 0) {
    for (const file of evidenceFiles) {
      const uploaded = await uploadEvidence(file.base64);
      evidence.push({
        type: file.type || 'image',
        url: uploaded.secure_url,
        description: file.description || '',
      });
    }
  }

  let dispute;
  try {
    dispute = await Dispute.create({
      disputeId: Dispute.generateDisputeId(),
      orderId,
      taskId: order.orderId,
      chatId,
      escrowId: order.escrowId || undefined,
      initiatedBy: raisedById,
      initiatedByModel: raisedBy === 'user' ? 'User' : 'Runner',
      userId: order.userId,
      runnerId: order.runnerId,
      reason,
      description,
      evidence,
      status: 'open',
      escrowPaused: !!escrowId,
      isPostCompletion,
      messages: [{
        from: raisedBy,
        message: `Dispute raised: ${description}`,
        timestamp: new Date(),
      }],
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new Error('An active dispute already exists for this order.');
    }
    throw err;
  }

  if (isPostCompletion) {

    if (escrowId) {
      const escrow = await Escrow.findById(escrowId);
      if (escrow?.deliveryFeeReleased && escrow.runnerPayout > 0) {
        const runnerWallet = await Wallet.findOne({
          userId: order.runnerId,
          userType: 'runner',
        });

        if (runnerWallet && runnerWallet._balance >= escrow.runnerPayout) {
          runnerWallet._balance -= escrow.runnerPayout;
          runnerWallet.lockedBalance = (runnerWallet.lockedBalance || 0) + escrow.runnerPayout;
          await runnerWallet.save();

          await LedgerEntry.create({
            userId: order.runnerId,
            userModel: 'Runner',
            runnerId: order.runnerId,
            type: 'escrow_lock',
            grossAmount: escrow.runnerPayout,
            netAmount: escrow.runnerPayout,
            providerFee: 0,
            provider: 'system',
            orderId,
            escrowId,
            description: `₦${escrow.runnerPayout.toLocaleString()} earned from order ${orderId} locked — post-completion dispute in review`,
            status: 'completed',
          });

          await sendPushNotification({
            recipientId: order.runnerId,
            recipientType: 'runner',
            title: 'Earnings Locked',
            body: `₦${escrow.runnerPayout.toLocaleString()} you earned from order ${orderId} has been locked pending dispute review.`,
            data: { type: 'dispute_lock', orderId, disputeId: dispute.disputeId },
          });

          // Store on dispute so resolveDispute knows what pool to work from
          dispute.lockedRunnerAmount = escrow.runnerPayout;
          await dispute.save();
        } else {

          dispute.lockRequiredButFailed = true;
          dispute.lockFailureReason = runnerWallet
            ? `Runner wallet balance (₦${runnerWallet._balance}) insufficient to lock ₦${escrow.runnerPayout}`
            : 'Runner wallet not found';
          await dispute.save();

          console.warn(
            `[raiseDispute] Could not lock runner funds for order ${orderId} — ` +
            `${dispute.lockFailureReason}. Admin must resolve manually.`
          );
        }
      }

      // Mark escrow disputed even post-completion so admin dashboard sees it
      await Escrow.findByIdAndUpdate(escrowId, { status: 'disputed' });
    }

    // Notify user that dispute is under review
    await sendPushNotification({
      recipientId: order.userId,
      recipientType: 'user',
      title: 'Dispute Raised',
      body: `A dispute has been raised for your completed order ${orderId}. Our team will review it shortly.`,
      data: { type: 'dispute_raised', orderId, disputeId: dispute.disputeId },
    });

  } else {
    // ── Mid-order path ──────────────────────────────────────────────────────
    // Pause escrow and transition order to 'disputed'.

    if (escrowId) {
      await Escrow.findByIdAndUpdate(escrowId, { status: 'disputed' });
    }

    const nonTransitionableStatuses = ['pending_payment', 'payment_failed', 'cancelled', 'completed', 'task_completed'];
    if (!nonTransitionableStatuses.includes(order.status)) {
      await orderStateMachine.transition(orderId, 'disputed', {
        triggeredBy: raisedBy,
        triggeredById: raisedById,
        note: `Dispute raised: ${reason}`,
      });
    } else {
      order.hasDispute = true;
      await order.save();
    }
  }

  console.log(`Dispute ${dispute.disputeId} raised for order ${orderId} (${isPostCompletion ? 'post-completion' : 'mid-order'})`);
  return dispute;
};

/**
 * Resolve a dispute (admin only).
 */
const resolveDispute = async ({
  disputeId,
  outcome,
  releasePercentage,
  adminNote,
  resolvedBy,
}) => {
  const dispute = await Dispute.findOne({ disputeId });
  if (!dispute) throw new Error('Dispute not found');
  if (dispute.isFinal) throw new Error('This dispute is already finalized');

  const isPostCompletion = dispute.isPostCompletion === true;

  if (isPostCompletion && dispute.lockRequiredButFailed && !(dispute.lockedRunnerAmount > 0)) {
    throw new Error(
      `Cannot auto-resolve: runner funds were never locked for this post-completion ` +
      `dispute (${dispute.lockFailureReason || 'reason unknown'}). This requires manual ` +
      `admin intervention outside the normal resolution flow.`
    );
  }

  // Resolve escrow doc
  let escrow = null;
  if (dispute.escrowId) {
    escrow = await Escrow.findById(dispute.escrowId);
  } else {
    const order = await Order.findOne({ orderId: dispute.orderId })
      .select('_id')
      .sort({ createdAt: -1 })
      .lean();
    if (order) escrow = await Escrow.findOne({ orderId: order._id });
  }

  // No escrow — close dispute without moving money
  if (!escrow) {
    dispute.status = outcome === 'dismiss_dispute' ? 'dismissed' : 'resolved';
    dispute.isFinal = true;
    dispute.flaggedAsFraud = outcome === 'dismiss_dispute';
    dispute.resolution = {
      outcome,
      amountToUser: 0,
      amountToRunner: 0,
      notes: adminNote || 'No escrow found — order was not paid',
      resolvedBy,
      resolvedAt: new Date(),
    };
    await dispute.save();
    return {
      dispute: await Dispute.findOne({ disputeId })
        .populate('userId', 'firstName lastName email')
        .populate('runnerId', 'firstName lastName email'),
      amountToUser: 0,
      amountToRunner: 0,
    };
  }

  const isDismissed = outcome === 'dismiss_dispute';
  const totalAmount = isPostCompletion ? dispute.lockedRunnerAmount : escrow.totalAmount;

  let amountToUser = 0;
  let amountToRunner = 0;

  const result = await withTransaction(async (session) => {
    if (!isDismissed) {
      switch (outcome) {
        case 'full_release':
          amountToRunner = totalAmount;
          break;
        case 'full_refund':
          amountToUser = totalAmount;
          break;
        case 'partial_release': {
          const runnerPct = releasePercentage || 50;
          amountToRunner = Math.round(totalAmount * (runnerPct / 100));
          amountToUser = totalAmount - amountToRunner;
          break;
        }
        case 'partial_refund': {
          const userPct = releasePercentage || 50;
          amountToUser = Math.round(totalAmount * (userPct / 100));
          amountToRunner = totalAmount - amountToUser;
          break;
        }
        default:
          throw new Error(`Unknown outcome: ${outcome}`);
      }

      if (isPostCompletion) {
        const runnerWallet = await Wallet.findOne({ userId: dispute.runnerId, userType: 'runner' }).session(session);
        if (!runnerWallet) throw new Error('Runner wallet not found');
        runnerWallet.lockedBalance = Math.max(0, (runnerWallet.lockedBalance || 0) - dispute.lockedRunnerAmount);
        if (amountToRunner > 0) runnerWallet._balance += amountToRunner;
        await runnerWallet.save({ session });

        if (amountToUser > 0) {
          const userWallet = await Wallet.findOne({ userId: dispute.userId, userType: 'user' }).session(session);
          if (!userWallet) throw new Error('User wallet not found');
          userWallet._balance += amountToUser;
          await userWallet.save({ session });
        }
      } else {
        if (amountToUser > 0) {
          const userWallet = await Wallet.findOne({ userId: escrow.userId, userType: 'user' }).session(session);
          if (!userWallet) throw new Error('User wallet not found');
          userWallet._balance += amountToUser;
          await userWallet.save({ session });
        }
        if (amountToRunner > 0) {
          const runnerWallet = await Wallet.findOne({ userId: escrow.runnerId, userType: 'runner' }).session(session);
          if (!runnerWallet) throw new Error('Runner wallet not found');
          runnerWallet._balance += amountToRunner;
          await runnerWallet.save({ session });
        }
      }

      const ledgerEntries = [];
      if (amountToUser > 0) {
        ledgerEntries.push({
          userId: dispute.userId,
          userModel: 'User',
          type: 'refund',
          grossAmount: amountToUser,
          netAmount: amountToUser,
          providerFee: 0,
          provider: 'system',
          orderId: dispute.orderId,
          escrowId: escrow._id,
          description: `Dispute refund for order ${dispute.orderId} — ${outcome}`,
          status: 'completed',
        });
      }
      if (amountToRunner > 0) {
        ledgerEntries.push({
          userId: dispute.runnerId,
          userModel: 'Runner',
          runnerId: dispute.runnerId,
          type: 'escrow_release',
          grossAmount: amountToRunner,
          netAmount: amountToRunner,
          providerFee: 0,
          provider: 'system',
          orderId: dispute.orderId,
          escrowId: escrow._id,
          description: `Dispute payout for order ${dispute.orderId} — ${outcome}`,
          status: 'completed',
        });
      }
      if (ledgerEntries.length > 0) await LedgerEntry.create(ledgerEntries, { session });
    }

    dispute.status = isDismissed ? 'dismissed' : 'resolved';
    dispute.isFinal = true;
    dispute.escrowPaused = false;
    dispute.flaggedAsFraud = isDismissed;
    dispute.resolution = {
      outcome,
      amountToUser,
      amountToRunner,
      releasePercentage: releasePercentage || null,
      notes: adminNote,
      resolvedBy,
      resolvedAt: new Date(),
      notifiedAt: new Date(),
    };
    dispute.messages.push({
      from: 'admin',
      message: isDismissed
        ? `Dispute dismissed — suspected fraud. ${adminNote || ''}`
        : `Dispute resolved: ${outcome}. ${adminNote || ''}`,
      timestamp: new Date(),
    });
    await dispute.save({ session });

    let finalEscrowStatus;
    if (isDismissed) {
      finalEscrowStatus = isPostCompletion ? 'released' : 'funded';
    } else {
      switch (outcome) {
        case 'full_refund':
          finalEscrowStatus = 'refunded';
          break;
        case 'partial_release':
        case 'partial_refund':
          finalEscrowStatus = 'partially_released';
          break;
        case 'full_release':
        default:
          finalEscrowStatus = 'released';
          break;
      }
    }

    await Escrow.findByIdAndUpdate(
      escrow._id,
      { status: finalEscrowStatus },
      { session }
    );

    return { amountToUser, amountToRunner };
  });

  amountToUser = result.amountToUser;
  amountToRunner = result.amountToRunner;

  if (!isPostCompletion && !isDismissed) {
    await orderStateMachine.transition(dispute.orderId, 'dispute_resolved', {
      triggeredBy: 'admin',
      triggeredById: resolvedBy,
      note: `Resolved: ${outcome}. ${adminNote || ''}`,
    });
  }


  if (isDismissed) {
    await Promise.allSettled([
      sendPushNotification({
        recipientId: dispute.userId,
        recipientType: 'user',
        title: 'Dispute Dismissed',
        body: `Your dispute for order ${dispute.orderId} was reviewed and dismissed. No further action will be taken.`,
        data: { type: 'dispute_dismissed', orderId: dispute.orderId },
      }),
      sendPushNotification({
        recipientId: dispute.runnerId,
        recipientType: 'runner',
        title: 'Dispute Dismissed',
        body: `A dispute for order ${dispute.orderId} was reviewed and dismissed.`,
        data: { type: 'dispute_dismissed', orderId: dispute.orderId },
      }),
    ]);
  } else {
    const outcomeMessages = {
      full_release: {
        user: 'Your dispute was reviewed. No refund was issued.',
        runner: `₦${amountToRunner.toLocaleString()} has been released to your wallet.`,
      },
      full_refund: {
        user: `₦${amountToUser.toLocaleString()} has been refunded to your wallet.`,
        runner: 'Your dispute was reviewed. Funds were returned to the customer.',
      },
      partial_release: {
        user: amountToUser > 0
          ? `₦${amountToUser.toLocaleString()} was refunded to your wallet.`
          : 'Your dispute was reviewed. No refund was issued.',
        runner: `₦${amountToRunner.toLocaleString()} has been released to your wallet.`,
      },
      partial_refund: {
        user: `₦${amountToUser.toLocaleString()} was refunded to your wallet.`,
        runner: amountToRunner > 0
          ? `₦${amountToRunner.toLocaleString()} has been released to your wallet.`
          : 'Your dispute was reviewed. Funds were returned to the customer.',
      },
    };

    const msgs = outcomeMessages[outcome];
    if (msgs) {
      await Promise.allSettled([
        sendPushNotification({
          recipientId: dispute.userId,
          recipientType: 'user',
          title: 'Dispute Resolved',
          body: msgs.user,
          data: { type: 'dispute_resolved', orderId: dispute.orderId, outcome },
        }),
        sendPushNotification({
          recipientId: dispute.runnerId,
          recipientType: 'runner',
          title: 'Dispute Resolved',
          body: msgs.runner,
          data: { type: 'dispute_resolved', orderId: dispute.orderId, outcome },
        }),
      ]);
    }
  }


  const populated = await Dispute.findOne({ disputeId })
    .populate('userId', 'firstName lastName email')
    .populate('runnerId', 'firstName lastName email');

  console.log(`Dispute ${disputeId} resolved: ${outcome} | toUser=₦${amountToUser} | toRunner=₦${amountToRunner}`);

  return { dispute: populated, amountToUser, amountToRunner };
};

const getDisputeByOrderId = async (orderId) =>
  Dispute.findOne({ orderId }).sort({ createdAt: -1 });

const getAllDisputes = async (page = 1, limit = 20, status = null) => {
  const query = status ? { status } : {};
  const skip = (page - 1) * limit;
  const disputes = await Dispute.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'firstName lastName email')
    .populate('runnerId', 'firstName lastName email');
  const total = await Dispute.countDocuments(query);
  return { disputes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const getDisputesByRunnerId = async (runnerId) =>
  Dispute.find({ runnerId })
    .populate('orderId', 'orderId serviceType createdAt')
    .sort({ createdAt: -1 });

const getDisputesByUserId = async (userId) =>
  Dispute.find({ userId })
    .sort({ createdAt: -1 })
    .populate('runnerId', 'firstName lastName');

module.exports = {
  raiseDispute,
  resolveDispute,
  getDisputeByOrderId,
  getDisputesByRunnerId,
  getDisputesByUserId,
  getAllDisputes,
};