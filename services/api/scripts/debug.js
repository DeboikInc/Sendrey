// scripts/checkOrder.js
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order'); // adjust path to match your project

const userId = process.argv[2];
const runnerId = process.argv[3];
const chatId = process.argv[4];

if (!userId || !runnerId || !chatId) {
  console.error('Usage: node scripts/debug.js <userId> <runnerId> <chatId>');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.DATABASE_URL);

  console.log('\n=== Orders matching userId ===');
  const byUser = await Order.find({ userId }).sort({ createdAt: -1 }).lean();
  byUser.forEach(o => console.log({
    orderId: o.orderId, chatId: o.chatId, status: o.status,
    userId: o.userId, runnerId: o.runnerId, createdAt: o.createdAt,
  }));
  if (!byUser.length) console.log('(none)');

  console.log('\n=== Orders matching runnerId ===');
  const byRunner = await Order.find({ runnerId }).sort({ createdAt: -1 }).lean();
  byRunner.forEach(o => console.log({
    orderId: o.orderId, chatId: o.chatId, status: o.status,
    userId: o.userId, runnerId: o.runnerId, createdAt: o.createdAt,
  }));
  if (!byRunner.length) console.log('(none)');

  console.log('\n=== Orders matching exact chatId ===');
  const byChat = await Order.find({ chatId }).sort({ createdAt: -1 }).lean();
  byChat.forEach(o => console.log({
    orderId: o.orderId, chatId: o.chatId, status: o.status,
    userId: o.userId, runnerId: o.runnerId, createdAt: o.createdAt,
  }));
  if (!byChat.length) console.log('(none — this is the smoking gun if byUser/byRunner show orders with a DIFFERENT chatId)');

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});