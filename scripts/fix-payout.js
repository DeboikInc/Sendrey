const mongoose = require('mongoose');
require('dotenv').config();

const Escrow = require('../models/Escrows');
const Order = require('../models/Order');
const RunnerPayout = require('../models/RunnerPayout');
const paymentService = require('../services/paymentServices');
const { calculateFeeSplit } = require('../config/pricing');

const orderId = 'ORD-MNE2GVC4-YQ01Y';

(async () => {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connected');

  const order = await Order.findOne({ orderId }).lean();
  if (!order) return console.log('Order not found');
  console.log('Order:', { orderId: order.orderId, totalAmount: order.totalAmount, deliveryFee: order.deliveryFee });

  const feeSplit = calculateFeeSplit(order.deliveryFee);

  // Create the missing escrow
  const escrow = await Escrow.create({
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
  });
  console.log('Escrow created:', escrow._id);

  // Patch the order
  await Order.findOneAndUpdate({ orderId }, { $set: { escrowId: escrow._id } });
  console.log('Order patched');

  // Trigger payout
  const result = await paymentService.payoutToRunner(escrow._id);
  console.log('Payout result:', result);

  process.exit(0);
})();