// scripts/resetAllStuck.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Runner = require('../models/Runner');
const Order = require('../models/Order');

async function reset() {
  await mongoose.connect(process.env.DATABASE_URL);

  // Cancel all non-terminal orders
  const orders = await Order.updateMany(
    { status: { $nin: ['completed', 'cancelled', 'task_completed'] } },
    { $set: { status: 'cancelled', cancelReason: 'dev_reset' } }
  );

  // Reset all users and runners
  const [users, runners] = await Promise.all([
    User.updateMany({}, { $set: { isAvailable: true, activeOrderId: null } }),
    Runner.updateMany({}, { $set: { isAvailable: true, activeOrderId: null } }),
  ]);

  console.log(`Orders cancelled: ${orders.modifiedCount}`);
  console.log(`Users reset: ${users.modifiedCount}`);
  console.log(`Runners reset: ${runners.modifiedCount}`);
  process.exit(0);
}

reset().catch(err => { console.error(err); process.exit(1); });
// node scripts/resetStuckPair.js