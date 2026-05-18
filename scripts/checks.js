require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const LedgerEntry = require('../models/LedgerEntry');
  const User = require('../models/User');

  const user = await User.findOne({ email: 'tinukekareem17@gmail.com' }).lean();
  console.log('User:', user._id);

  // Check both orders
  const orders = ['ORD-MPB556X6-71MYH', 'YOUR-RUN-ERRAND-ORDER-ID'];
  
  for (const orderId of orders) {
    const entries = await LedgerEntry.find({ orderId }).lean();
    console.log(`\n=== ${orderId} ===`);
    console.log(`Entries found: ${entries.length}`);
    entries.forEach(e => {
      console.log(`  type: ${e.type} | userId: ${e.userId} | gross: ${e.grossAmount} | provider: ${e.provider}`);
    });
  }

  // All ledger entries for this user
  const allEntries = await LedgerEntry.find({ userId: user._id }).sort({ createdAt: 1 }).lean();
  console.log(`\n=== ALL USER LEDGER ENTRIES (${allEntries.length}) ===`);
  allEntries.forEach(e => {
    console.log(`${e.createdAt.toISOString().slice(0,16)} | ${e.type.padEnd(20)} | NGN ${e.grossAmount} | order: ${e.orderId} | provider: ${e.provider}`);
  });

  mongoose.disconnect();
}).catch(console.error);