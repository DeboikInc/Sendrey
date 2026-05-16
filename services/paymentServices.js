const paystack = require('../config/paystack');
const orderStateMachine = require('../services/orderStateMachine');
const { notifyEscrowReleased } = require('./notificationService');
const { withTransaction } = require('../utils/withTransaction');
const { calculateFeeSplit } = require('../config/pricing');

const Wallet = require('../models/Wallet');
const Escrow = require('../models/Escrows');
const Order = require('../models/Order');
const User = require('../models/User');
const Runner = require('../models/Runner');
const RunnerPayout = require('../models/RunnerPayout');
const PlatformEarnings = require('../models/PlatformEarnings');
const LedgerEntry = require('../models/LedgerEntry');
const { Chat } = require('../models/Chat');

const mongoose = require('mongoose');

let ioInstance;
const getSocketIO = () => {
  if (ioInstance) return ioInstance;
  try {
    const socketModule = require('../socket');
    if (socketModule && typeof socketModule.getIO === 'function') {
      ioInstance = socketModule.getIO();
    } else {
      console.warn('socketModule.getIO is not a function yet');
      return null;
    }
  } catch (err) {
    console.warn('Socket module not ready yet:', err.message);
    return null;
  }
  return ioInstance;
};

class PaymentService {

  async createVirtualAccount(userId, email, fullName) {
    try {
      const customer = await paystack.createCustomer({
        email,
        first_name: fullName.split(' ')[0],
        last_name: fullName.split(' ').slice(1).join(' ') || fullName,
        metadata: { userId: userId.toString() }
      });

      const customerCode = customer.data.customer_code;

      const virtualAccount = await paystack.createDedicatedVirtualAccount({
        customer: customerCode,
        preferred_bank: process.env.NODE_ENV === 'production' ? 'wema-bank' : 'test-bank'
      });

      await User.findByIdAndUpdate(userId, {
        paystackCustomerCode: customerCode,
        virtualAccount: {
          bankName: virtualAccount.data.bank.name,
          accountNumber: virtualAccount.data.account_number,
          accountName: virtualAccount.data.account_name,
        }
      }) || await Runner.findByIdAndUpdate(userId, {
        paystackCustomerCode: customerCode,
        virtualAccount: {
          bankName: virtualAccount.data.bank.name,
          accountNumber: virtualAccount.data.account_number,
          accountName: virtualAccount.data.account_name,
        }
      });

      console.log(`Virtual account created for ${email}`);
      return virtualAccount.data;
    } catch (error) {
      console.error('Error creating virtual account:', error.message);
      throw error;
    }
  }

  async payForOrder(orderId, paymentMethod, userId, userEmail) {
    const order = await Order.findOne({ orderId }).sort({ createdAt: -1 }).lean();
    if (!order) throw new Error('Order not found');
    if (order.paymentStatus === 'paid') throw new Error('Order already paid');

    const feeSplit = calculateFeeSplit(order.deliveryFee);

    if (paymentMethod === 'wallet') {
      // ── Pre-fetch wallet OUTSIDE transaction (read-only check) ──────────
      const walletCheck = await Wallet.findOne({ userId }).lean();
      if (!walletCheck || walletCheck.balance < order.totalAmount) {
        throw new Error('Insufficient wallet balance');
      }

      return withTransaction(async (session) => {
        // ── All writes in parallel where possible ────────────────────────
        const lockedOrder = await Order.findOneAndUpdate(
          { orderId, paymentStatus: { $ne: 'paid' } },
          { $set: { paymentStatus: 'processing' } },
          { new: true, session }
        );
        if (!lockedOrder) throw new Error('Order already paid or not found');

        // Wallet deduct + escrow create + ledger — wallet must go first
        const wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet || wallet.balance < order.totalAmount) {
          throw new Error('Insufficient wallet balance');
        }

        const [, [escrow]] = await Promise.all([
          Wallet.findOneAndUpdate(
            { userId },
            { $inc: { _balance: -order.totalAmount, lockedBalance: order.totalAmount } },
            { session }
          ),
          Escrow.create([escrowDoc], { session }),
        ]);

        const escrowDoc = {
          taskId: orderId,
          userId: order.userId,
          runnerId: order.runnerId,
          taskType: order.taskType,
          itemBudget: order.itemBudget,
          deliveryFee: order.deliveryFee,
          totalAmount: order.totalAmount,
          platformFee: feeSplit.platformFee,
          runnerPayout: feeSplit.runnerPayout,
          providerFee: feeSplit.providerFee,
          netPlatformFee: feeSplit.netPlatformFee,
          status: 'funded',
          paymentStatus: 'paid',
        };

        // Order update + ledger in parallel
        await Promise.all([
          Order.findOneAndUpdate(
            { orderId },
            { $set: { escrowId: escrow._id, paymentStatus: 'paid', status: 'paid' } },
            { session }
          ),
          LedgerEntry.create([{
            userId: order.userId,
            userModel: 'User',
            runnerId: order.runnerId,
            type: 'escrow_lock',
            grossAmount: order.totalAmount,
            netAmount: order.totalAmount - feeSplit.providerFee,
            providerFee: feeSplit.providerFee,
            platformFee: feeSplit.platformFee,
            netPlatformFee: feeSplit.netPlatformFee,
            runnerFee: feeSplit.runnerPayout,
            provider: 'wallet',
            orderId,
            escrowId: escrow._id,
            description: `Order Payment (Wallet) for ${orderId}`,
            status: 'completed',
          }], { session }),
        ]);

        return {
          escrowId: escrow._id,
          paymentStatus: 'paid',
          totalAmount: order.totalAmount,
          feeSplit,
        };
      });

    } else if (paymentMethod === 'card') {
      const paystackResponse = await paystack.initializeTransaction({
        email: userEmail,
        amount: order.totalAmount,
        metadata: { orderId, userId: userId.toString() },
      });

      return {
        reference: paystackResponse.data.reference,
        authorizationUrl: paystackResponse.data.authorization_url,
        amount: order.totalAmount,
        paymentStatus: 'pending',
        feeSplit,
      };
    }
  }

  async verifyPayment(reference) {
    const verification = await paystack.verifyTransaction(reference);
    console.log('[verifyWalletFunding] raw verification:', JSON.stringify(verification, null, 2));


    if (!verification.status) {
      throw new Error('Payment verification failed');
    }

    const { status: txStatus } = verification.data;

    const isProcessable = txStatus === 'success' ||
      (process.env.NODE_ENV === 'development' && txStatus !== 'failed');

    if (!isProcessable) {
      const err = new Error(
        txStatus === 'abandoned'
          ? 'Payment was not completed. Please try again.'
          : `Payment unsuccessful (status: ${txStatus}). Please try again.`
      );
      err.statusCode = 400;
      throw err;
    }

    const { orderId } = verification.data.metadata;

    const result = await withTransaction(async (session) => {

      const order = await Order.findOneAndUpdate(
        { orderId, paymentStatus: { $ne: 'paid' } },
        { $set: { paymentStatus: 'processing' } },
        { new: true, session }
      );
      if (!order) return { alreadyPaid: true };

      // Use the delivery fee stored on the order — set at creation using distance calc
      const feeSplit = calculateFeeSplit(order.deliveryFee);

      const [escrow] = await Escrow.create([{
        taskId: orderId,
        userId: order.userId,
        runnerId: order.runnerId,
        taskType: order.taskType,
        itemBudget: order.itemBudget,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
        platformFee: feeSplit.platformFee,
        runnerPayout: feeSplit.runnerPayout,
        providerFee: feeSplit.providerFee,
        netPlatformFee: feeSplit.netPlatformFee,
        status: 'funded',
        paymentStatus: 'paid',
        paystackReference: reference,
      }], { session });

      await Order.findOneAndUpdate(
        { orderId },
        { $set: { escrowId: escrow._id, paymentStatus: 'paid', status: 'paid' } },
        { session }
      );

      await LedgerEntry.create([{
        userId: order.userId,
        userModel: 'User',
        runnerId: order.runnerId,
        type: 'escrow_lock',
        grossAmount: order.totalAmount,
        netAmount: order.totalAmount - feeSplit.providerFee,
        providerFee: feeSplit.providerFee,
        platformFee: feeSplit.platformFee,
        netPlatformFee: feeSplit.netPlatformFee,
        runnerFee: feeSplit.runnerPayout,
        provider: 'paystack',
        providerReference: reference,
        orderId,
        escrowId: escrow._id,
        description: `Order Payment (Card) for ${orderId}`,
        status: 'completed',
      }], { session });

      console.log(`✅ Card payment verified | runner: NGN ${feeSplit.runnerPayout} | platform net: NGN ${feeSplit.netPlatformFee} | paystack fee: NGN ${feeSplit.providerFee}`);
      return { escrow, order, feeSplit };
    });

    // ← emit AFTER transaction commits
    if (!result.alreadyPaid) {
      const io = getSocketIO();
      if (io && result.order?.chatId) {
        io.to(result.order.chatId).emit('paymentSuccess', {
          orderId,
          escrowId: result.escrow._id,
          paymentStatus: 'paid',
        });
        console.log(`✅ paymentSuccess emitted to room ${result.order.chatId}`);
      }
    }

    return result;
  }

  async fundWallet(userId, amount, userEmail) {
    if (amount < 100) throw new Error('Minimum funding amount is ₦100');

    const paystackResponse = await paystack.initializeTransaction({
      email: userEmail,
      amount,
      metadata: { userId: userId.toString(), type: 'wallet_funding' }
    });

    console.log('✅ Wallet funding initialized');
    return {
      reference: paystackResponse.data.reference,
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
    };
  }

  async verifyWalletFunding(reference) {
    const verification = await paystack.verifyTransaction(reference);
    console.log('[verifyWalletFunding] raw verification:', JSON.stringify(verification, null, 2));

    if (!verification.status) {
      throw new Error('Payment verification failed');
    }

    const { status: txStatus } = verification.data;

    const isProcessable = txStatus === 'success' ||
      (process.env.NODE_ENV === 'development' && txStatus !== 'failed');

    if (!isProcessable) {
      const err = new Error(
        txStatus === 'abandoned'
          ? 'Payment was not completed. Please try again.'
          : `Payment unsuccessful (status: ${txStatus}). Please try again.`
      );
      err.statusCode = 400;
      throw err;
    }

    const { userId } = verification.data.metadata;
    const grossAmount = verification.data.amount / 100;

    return withTransaction(async (session) => {
      const existing = await LedgerEntry.findOne({ providerReference: reference }).session(session);
      if (existing) {
        console.warn(`verifyWalletFunding: duplicate webhook for ref ${reference}`);
        return { alreadyProcessed: true };
      }

      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) throw new Error('Wallet not found');

      await wallet.credit(
        grossAmount,
        reference,
        { type: 'wallet_funding', userId }
      );

      await LedgerEntry.create([{
        userId,
        userModel: 'User',
        type: 'deposit',
        grossAmount,
        netAmount: grossAmount,
        providerFee: 0,
        platformFee: 0,
        netPlatformFee: 0,
        runnerFee: 0,
        balanceBefore: wallet._balance - grossAmount,
        balanceAfter: wallet._balance,
        provider: 'paystack',
        providerReference: reference,
        description: `Wallet funded via Paystack`,
        status: 'completed',

      }], { session });

      console.log(`✅ Wallet funded: NGN ${grossAmount} for user ${userId}`);
      return { balance: wallet.balance, amount: grossAmount };
    });
  }

  async lockWalletFunds(userId, amount, escrowId) {
    return withTransaction(async (session) => {
      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient balance for escrow');
      }

      await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { _balance: -amount, lockedBalance: amount } },
        { session }
      );

      console.log(`🔒 Locked NGN ${amount} for escrow ${escrowId}`);
    });
  }

  async unlockWalletFunds(userId, amount) {
    return withTransaction(async (session) => {
      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) throw new Error('Wallet not found');

      const safeUnlock = Math.min(amount, wallet.lockedBalance ?? 0);
      await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { lockedBalance: -safeUnlock } },
        { session }
      );
      await wallet.credit(amount, `unlock-${userId}-${Date.now()}`, { reason: 'escrow_unlock' });

      console.log(`Unlocked NGN ${amount} for user ${userId}`);
    });
  }

  async payoutToRunner(escrowId) {
    const claimed = await Escrow.findOneAndUpdate(
      { _id: escrowId, deliveryFeeReleased: { $ne: true } },
      { $set: { deliveryFeeReleased: true } },
      { new: false } // return original doc to confirm we claimed it
    );

    if (!claimed) {
      console.log(`[payoutToRunner] already released or not found for escrow ${escrowId} — skipping`);
      return { alreadyReleased: true };
    }


    return withTransaction(async (session) => {
      const escrow = await Escrow.findById(escrowId).session(session);
      if (!escrow) throw new Error('Escrow not found');

      console.log(`[payoutToRunner] escrowId=${escrowId} | runnerId=${escrow.runnerId} | taskId=${escrow.taskId}`);

      const runner = await Runner.findById(escrow.runnerId).session(session);
      if (!runner) throw new Error('Runner not found');

      let runnerWallet = await Wallet.findOne({
        userId: escrow.runnerId,
        userType: 'runner',
      }).session(session);

      if (!runnerWallet) {
        [runnerWallet] = await Wallet.create([{
          userId: escrow.runnerId,
          userType: 'runner',
          balance: 0,
          lockedBalance: 0,
        }], { session });
        console.log(`Created missing wallet for runner ${escrow.runnerId}`);
      }

      const order = await Order.findOne({
        $or: [{ escrowId: escrow._id }, { orderId: escrow.taskId }]
      }).sort({ createdAt: -1 }).session(session);

      const resolvedOrderId = order?.orderId ?? escrow.taskId;

      console.log(`[payoutToRunner] order found=${!!order} | orderId=${order?.orderId} | serviceType=${order?.serviceType}`);

      let usedPayoutSystem = false;

      if (order) {
        if (order.serviceType === 'run-errand' || order.serviceType === 'run_errand') {
          const payout = await RunnerPayout.findOne({ orderId: order.orderId }).session(session);
          console.log(`[payoutToRunner] RunnerPayout found=${!!payout} | usedPayoutSystem=${payout?.usedPayoutSystem} | status=${payout?.status}`);
          if (payout) usedPayoutSystem = payout.usedPayoutSystem;
        } else {
          usedPayoutSystem = true;
          console.log(`[payoutToRunner] pick-up order — usedPayoutSystem forced true`);
        }
      } else {
        console.warn(`[payoutToRunner] NO ORDER FOUND for escrow ${escrowId}`);
      }

      // Use stored fee split from escrow; recalculate only as fallback
      const providerFee = escrow.providerFee ?? calculateFeeSplit(escrow.deliveryFee).providerFee;
      const netPlatformFee = escrow.netPlatformFee ?? (escrow.platformFee - providerFee);

      if (usedPayoutSystem) {
        await runnerWallet.credit(
          escrow.runnerPayout,
          `payout-${escrowId}-${Date.now()}`,
          { orderId: resolvedOrderId, escrowId }
        );

        console.log('[payoutToRunner] writing ledger entries for orderId:', resolvedOrderId);
        await LedgerEntry.create([{
          userId: escrow.runnerId.toString(),
          userModel: 'Runner',
          orderId: resolvedOrderId,
          escrowId: escrow._id,
          runnerId: escrow.runnerId,
          type: 'escrow_release',
          grossAmount: escrow.totalAmount,
          netAmount: escrow.runnerPayout,
          platformFee: escrow.platformFee,
          netPlatformFee: escrow.netPlatformFee,
          providerFee: escrow.providerFee ?? 0,
          runnerFee: escrow.runnerPayout,
          provider: 'system',
          description: `NGN ${escrow.runnerPayout.toString()} earned from completed order - ${resolvedOrderId.toString()}`,
          status: 'completed',
        }], { session });

        console.log('[payoutToRunner] ledger entries written');

        console.log(`✅ Runner credited NGN ${escrow.runnerPayout}`);
      } else {
        console.warn(`⚠️ Runner ${escrow.runnerId} forfeiting delivery fee NGN ${escrow.runnerPayout}`);
      }

      await PlatformEarnings.createIdempotent({
        orderId: resolvedOrderId,
        escrowId: escrow._id,
        amount: usedPayoutSystem ? netPlatformFee : netPlatformFee + escrow.runnerPayout,
        netAmount: usedPayoutSystem ? netPlatformFee : netPlatformFee + escrow.runnerPayout,
        providerFee,
        type: usedPayoutSystem ? 'platform_fee' : 'platform_fee_plus_forfeited_runner_fee',
        idempotencyKey: `payout-${resolvedOrderId}-${escrowId}`,
        status: 'pending',
      });

      await LedgerEntry.create([
        {
          userId: escrow.userId,
          userModel: 'User',
          runnerId: escrow.runnerId,
          orderId: resolvedOrderId,
          escrowId: escrow._id,
          type: 'escrow_release',
          grossAmount: escrow.runnerPayout,
          netAmount: escrow.runnerPayout,
          providerFee: 0,
          runnerFee: escrow.runnerPayout,
          provider: 'paystack',
          description: `Delivery fee released to runner for order ${resolvedOrderId}`,
          status: 'completed',
        },
        {
          userId: escrow.userId,
          userModel: 'User',
          orderId: resolvedOrderId,
          escrowId: escrow._id,
          type: 'platform_earning',
          grossAmount: escrow.platformFee,
          netAmount: netPlatformFee,
          providerFee,
          netPlatformFee,
          provider: 'paystack',
          description: `Platform fee for order ${resolvedOrderId}`,
          status: 'completed',
        },
        {
          userId: escrow.userId,
          userModel: 'User',
          orderId: resolvedOrderId,
          escrowId: escrow._id,
          type: 'provider_fee',
          grossAmount: providerFee,
          netAmount: providerFee,
          providerFee,
          provider: 'paystack',
          description: `Paystack fee for order ${resolvedOrderId}`,
          status: 'completed',
        },
      ], { session });

      // update escrow
      await Escrow.findByIdAndUpdate(
        escrowId,
        { $set: { status: escrow.itemBudgetReleased ? 'released' : escrow.status } },
        { session }
      );

      await Runner.findByIdAndUpdate(
        escrow.runnerId,
        { $inc: { completedOrders: 1 }, $set: { activeOrderId: null, currentUserId: null } },
        { session }
      );
      if (usedPayoutSystem) {
        const runner = await Runner.findById(escrow.runnerId).session(session);
        await runner.recordEarning(escrow.runnerPayout);
      }

      console.log(`payoutToRunner | runner: NGN ${usedPayoutSystem ? escrow.runnerPayout : 0} | platform net: NGN ${netPlatformFee} | paystack fee: NGN ${providerFee}`);

      return {
        runnerPayout: usedPayoutSystem ? escrow.runnerPayout : 0,
        platformFee: netPlatformFee,
        providerFee,
        usedPayoutSystem,
      };
    });
  }

  async releaseItemBudget(escrowId) {
    return withTransaction(async (session) => {
      const escrow = await Escrow.findById(escrowId).session(session);
      if (!escrow) throw new Error('Escrow not found');
      if (escrow.itemBudgetReleased) throw new Error('Item budget already released');

      const order = await Order.findOne({
        $or: [{ escrowId: escrow._id }, { orderId: escrow.taskId }]
      }).sort({ createdAt: -1 }).session(session);
      if (!order) throw new Error('Order not found for escrow');

      const existingPayout = await RunnerPayout.findOne({ orderId: order.orderId }).session(session);

      if (!existingPayout) {
        await RunnerPayout.create([{
          orderId: order.orderId,
          chatId: order.chatId,
          runnerId: escrow.runnerId,
          userId: escrow.userId,
          escrowId: escrow._id,
          itemBudget: escrow.itemBudget,
          status: 'pending',
          usedPayoutSystem: false,
        }], { session });

        await LedgerEntry.create([{
          userId: escrow.userId,
          userModel: 'User',
          runnerId: escrow.runnerId,
          type: 'item_budget',
          grossAmount: escrow.itemBudget,
          netAmount: escrow.itemBudget,
          providerFee: 0,
          provider: 'system',
          orderId: order.orderId,
          escrowId: escrow._id,
          description: `Item budget of NGN ${escrow.itemBudget.toString()} released for order ${order.orderId}`,
          status: 'completed',
        }], { session });

        console.log(`RunnerPayout created: NGN ${escrow.itemBudget} for order ${order.orderId}`);
      }

      await Escrow.findByIdAndUpdate(
        escrowId,
        { $set: { itemBudgetReleased: true, status: 'item_approved' } },
        { session }
      );

      return {
        payoutCreated: !existingPayout,
        itemBudget: escrow.itemBudget,
        orderId: order.orderId,
      };
    });
  }

  async getBankCode(bankName) {
    const banks = await paystack.getBanks();
    const bank = banks.data.find(b => b.name.toLowerCase().includes(bankName.toLowerCase()));
    if (!bank) throw new Error(`Bank not found: ${bankName}`);
    return bank.code;
  }

  async verifyVendorAccount({ accountNumber, bankName }) {
    const bankCode = await this.getBankCode(bankName);
    const verification = await paystack.verifyAccountNumber({ account_number: accountNumber, bank_code: bankCode });

    if (!verification.status || !verification.data || !verification.data.account_name) {
      const err = new Error('Vendor account number not found. Please confirm the account number and selected bank are correct.');
      err.statusCode = 422;
      throw err;
    }

    return {
      accountName: verification.data.account_name,
      accountNumber: verification.data.account_number,
      bankCode,
    };
  }

  async transferToVendor({ amount, bankName, accountNumber, accountName, vendorName, orderId, runnerId }) {
    // ── DEV MOCK ───────────────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  transferToVendor: DEV mock — skipping real Paystack transfer');
      return {
        success: true,
        reference: `mock-ref-${Date.now()}`,
        transferId: `mock-id-${Date.now()}`,
        transferCode: `mock-code-${Date.now()}`,
        recipientCode: `mock-recipient-${Date.now()}`,
        amount,
        status: 'success',
      };
    }
    // ── PRODUCTION ─────────────────────────────────────────

    try {
      const verified = await this.verifyVendorAccount({ accountNumber, bankName });

      if (verified.accountName.toLowerCase() !== accountName.toLowerCase()) {
        console.warn(`Account name mismatch: provided="${accountName}" vs verified="${verified.accountName}"`);
      }

      const recipient = await paystack.createTransferRecipient({
        name: verified.accountName,
        account_number: accountNumber,
        bank_code: verified.bankCode,
      });
      if (!recipient.status || !recipient.data) throw new Error('Failed to create transfer recipient');

      const transfer = await paystack.initiateTransfer({
        recipient_code: recipient.data.recipient_code,
        amount,
        reason: `Payment for items from ${vendorName} - Order ${orderId}`,
      });
      if (!transfer.status || !transfer.data) throw new Error('Transfer initiation failed');

      console.log(`Transfer initiated to ${vendorName}: NGN ${amount} | ref: ${transfer.data.reference}`);

      return {
        success: true,
        reference: transfer.data.reference,
        transferId: transfer.data.id,
        transferCode: transfer.data.transfer_code,
        recipientCode: recipient.data.recipient_code,
        amount,
        status: transfer.data.status,
      };
    } catch (error) {
      console.error('❌ transferToVendor error:', error);
      return { success: false, error: error.message || 'Transfer failed' };
    }
  }

  async uploadReceipt(base64String) {
    const cloudinary = require('../config/cloudinary');
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64String,
        {
          folder: 'payout-receipts',
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result.secure_url);
        }
      );
    });
  }

  async getTransactionHistory(userId, page = 1, limit = 20, userType) {
    const skip = (page - 1) * limit;
    const userModel = userType === 'runner' ? 'Runner' : 'User';

    const hiddenTypes = userType === 'runner'
      ? ['platform_earning', 'provider_fee', 'escrow_lock']
      : ['platform_earning', 'provider_fee', 'escrow_release', 'item_budget', 'item_budget_spent'];

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId.toString())
      : null;

    const query = {
      userId: userObjectId ? { $in: [userObjectId, userId.toString()] } : userId.toString(),
      type: { $nin: hiddenTypes }
    };

    const [entries, total] = await Promise.all([
      LedgerEntry.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LedgerEntry.countDocuments(query),
    ]);

    console.log('[getTransactionHistory] entries found:', entries.length);
    console.log('[getTransactionHistory] sample:', entries[0]);
    console.log('[getTransactionHistory] hiddenTypes:', hiddenTypes);

    return {
      transactions: entries.map(e => ({
        ...e,
        amount: (e.type === 'escrow_release' && e.userModel === 'Runner')
          ? e.netAmount
          : e.grossAmount,
        type: ['deposit', 'escrow_release', 'escrow_refund'].includes(e.type)
          ? 'credit'
          : 'debit',
        label: e.type === 'escrow_lock' ? (e.description || `Order Payment for ${e.orderId}`)
          : e.type === 'deposit' ? 'Wallet Funding (card)'
            : e.type === 'escrow_release' ? (e.description || `Earnings From Completed order - ${e.orderId}`)
              : e.type === 'item_budget' ? 'Item Budget'
                : e.type === 'item_budget_spent' ? (e.description || 'Item Purchase')
                  : e.type === 'escrow_refund' ? 'Dispute Refund'
                    : e.type === 'withdrawal' ? (e.description || 'Withdrawal initiated')
                      : e.description || e.type,
        description: e.description || null,  // pass through to UI
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    };
  }

  async submitPayoutReceipt({
    orderId, runnerId, userId, chatId,
    vendorName, amountSpent, changeAmount,
    bankName, accountNumber, accountName, receiptBase64,
  }) {
    const payout = await RunnerPayout.findOne({ orderId });
    if (!payout) throw new Error('Payout record not found');
    if (payout.status === 'submitted' || payout.status === 'approved') {
      throw new Error('Receipt already submitted for this order');
    }
    if (amountSpent > payout.itemBudget) {
      throw new Error(`Amount spent (NGN ${amountSpent.toString()}) exceeds budget (NGN ${payout.itemBudget.toString()})`);
    }

    const receiptUrl = await this.uploadReceipt(receiptBase64);

    const transferResult = await this.transferToVendor({
      amount: amountSpent, bankName, accountNumber,
      accountName, vendorName, orderId, runnerId,
    });
    if (!transferResult.success) throw new Error(transferResult.error || 'Transfer to vendor failed');

    const result = await withTransaction(async (session) => {
      const receiptEntry = {
        receiptUrl,
        vendorName,
        amountSpent,
        changeAmount,
        submittedAt: new Date(),
        status: 'pending',
        transferReference: transferResult.reference,
        transferId: transferResult.transferId,
      };

      const updatedPayout = await RunnerPayout.findOneAndUpdate(
        { orderId, runnerId },
        {
          $set: {
            vendorName, amountSpent, changeAmount, receiptUrl,
            status: 'submitted',
            submittedAt: new Date(),
            usedPayoutSystem: true,
            bankDetails: { bankName, accountNumber, accountName },
            transferReference: transferResult.reference,
            transferStatus: transferResult.status,
          },
          $push: { receiptHistory: receiptEntry },
        },
        { new: true, session }
      );

      console.log(`✅ Payout receipt submitted: order=${orderId} vendor=${vendorName} amount=NGN ${amountSpent.toString()} ref=${transferResult.reference}`);

      return {
        success: true,
        payout: updatedPayout,
        transferReference: transferResult.reference,
        receiptUrl,
      };
    });

    await this.notifyUserOfPayoutReceipt({
      chatId, userId, orderId, vendorName,
      amountSpent, changeAmount, receiptUrl, runnerId,
    }).catch(err => console.error('notifyUserOfPayoutReceipt failed (non-critical):', err.message));

    return result;
  }

  async notifyUserOfPayoutReceipt({ chatId, userId, orderId, vendorName, amountSpent, changeAmount, receiptUrl, runnerId }) {
    try {
      const submissionId = `payout-receipt-${Date.now()}`;
      const message = {
        id: submissionId,
        type: 'item_submission',
        messageType: 'item_submission',
        senderId: runnerId,
        senderType: 'runner',
        chatId,
        submissionId,
        items: [{
          name: `Shopping at ${vendorName}`,
          quantity: 1,
          price: amountSpent,
          note: changeAmount > 0 ? `NGN ${changeAmount.toString()} change to be returned` : undefined,
        }],
        receiptUrl,
        totalAmount: amountSpent,
        vendorName,
        changeAmount,
        status: 'pending',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        createdAt: new Date(),
      };

      const chat = await Chat.findOne({ chatId });
      if (chat) {
        await Chat.findOneAndUpdate(
          { chatId },
          { $push: { messages: message } }
        );
      }

      const io = getSocketIO();
      if (io) {
        io.to(chatId).emit('message', message);
        io.to(`user-${userId}`).emit('payoutReceiptSubmitted', {
          orderId, vendorName, amountSpent, changeAmount, receiptUrl, submissionId,
        });
      }

      console.log(`Notified user ${userId} of payout receipt submission`);
    } catch (error) {
      console.error('Error notifying user of payout receipt:', error);
    }
  }

  async withdrawFromWallet(runnerId, amount, bankDetails, options = {}) {
    return withTransaction(async (session) => {
      const wallet = await Wallet.findOne({ userId: runnerId, userType: 'runner' }).session(session);
      if (!wallet) throw new Error('Wallet not found');
      if (wallet.balance < amount) throw new Error('Insufficient wallet balance');

      // locked balance
      if ((wallet.lockedBalance || 0) > 0) {
        const availableBalance = wallet.balance - (wallet.lockedBalance || 0);
        if (amount > availableBalance) {
          const err = new Error(
            `NGN ${wallet.lockedBalance.toString()} of your balance is locked pending a dispute review. Available for withdrawal: NGN ${Math.max(0, availableBalance.toString())}`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      // Verify bank account before deducting
      const verification = await paystack.verifyAccountNumber({
        account_number: bankDetails.accountNumber,
        bank_code: bankDetails.bankCode,
      });

      if (!verification.status || !verification.data || !verification.data.account_name) {
        const err = new Error('Account number not found. Please confirm the account number and selected bank are correct.');
        err.statusCode = 422;
        throw err;
      }

      await wallet.debit(
        amount,
        `withdrawal-${runnerId}-${Date.now()}`,
        { bankDetails, type: 'withdrawal' }
      );

      // Create transfer recipient
      const recipient = await paystack.createTransferRecipient({
        name: verification.data.account_name,
        account_number: bankDetails.accountNumber,
        bank_code: bankDetails.bankCode,
      });
      if (!recipient.status || !recipient.data) throw new Error('Failed to create transfer recipient');

      // Initiate transfer
      const transfer = await paystack.initiateTransfer({
        recipient_code: recipient.data.recipient_code,
        amount,
        reason: `Sendrey runner withdrawal`,
      });
      if (!transfer.status || !transfer.data) throw new Error('Transfer initiation failed');

      // Ledger entry
      await LedgerEntry.create([{
        userId: runnerId.toString(),
        userModel: 'Runner',
        type: 'withdrawal',
        grossAmount: amount,
        netAmount: amount,
        providerFee: 0,
        netPlatformFee: 0,
        platformFee: 0,
        runnerFee: 0,
        balanceBefore: wallet._balance + amount,
        balanceAfter: wallet._balance,
        provider: 'paystack',
        providerReference: transfer.data.reference,
        description: `Withdrawal to ${bankDetails.accountName || verification.data.account_name} - NGN ${amount.toString()}`,
        status: 'completed',
      }], { session });

      console.log(`✅ Runner ${runnerId} withdrawal: NGN ${amount.toString()} | ref: ${transfer.data.reference} - ${bankDetails.bankCode}`);

      return {
        reference: transfer.data.reference,
        transferCode: transfer.data.transfer_code,
        amount,
        status: transfer.data.status,
      };
    });
  }
}

module.exports = new PaymentService();