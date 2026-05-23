

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connected\n');

  const db = mongoose.connection.db;
  const orders  = db.collection('orders');
  const escrows = db.collection('escrows');
  const ledger  = db.collection('ledgerentries');

  // All paid orders
  const paidOrders = await orders.find({
    paymentStatus: 'paid',
    escrowId: { $exists: true, $ne: null },
  }).toArray();

  console.log(`Paid orders found: ${paidOrders.length}`);

  let written = 0;
  let skipped = 0;

  for (const order of paidOrders) {
    // Check if escrow_lock already exists for this order + user
    const existing = await ledger.findOne({
      type: 'escrow_lock',
      userModel: 'User',
      orderId: order.orderId,
      userId: order.userId,
    });

    if (existing) {
      console.log(`  [SKIP] ${order.orderId} — escrow_lock already exists`);
      skipped++;
      continue;
    }

    const escrow = await escrows.findOne({ _id: order.escrowId });
    if (!escrow) {
      console.log(`  [SKIP] ${order.orderId} — escrow not found`);
      skipped++;
      continue;
    }

    // Determine provider — if escrow has paystackReference it was card, else wallet
    const provider = escrow.paystackReference ? 'paystack' : 'wallet';

    const entry = {
      userId: order.userId,
      userModel: 'User',
      runnerId: order.runnerId,
      type: 'escrow_lock',
      grossAmount: order.totalAmount ?? escrow.totalAmount,
      netAmount: (order.totalAmount ?? escrow.totalAmount) - (escrow.providerFee ?? 0),
      providerFee: escrow.providerFee ?? 0,
      platformFee: escrow.platformFee ?? 0,
      netPlatformFee: escrow.netPlatformFee ?? 0,
      runnerFee: escrow.runnerPayout ?? 0,
      provider,
      ...(escrow.paystackReference ? { providerReference: escrow.paystackReference } : {}),
      orderId: order.orderId,
      escrowId: escrow._id,
      description: `Order Payment (${provider === 'paystack' ? 'Card' : 'Wallet'}) for ${order.orderId}`,
      status: 'completed',
      reversalOf: null,
      reversedBy: null,
      metadata: { backfilled: true },
      createdAt: escrow.createdAt ?? order.createdAt ?? new Date(),
      updatedAt: new Date(),
      __v: 0,
    };

    await ledger.insertOne(entry);
    console.log(`  [WRITTEN] ${order.orderId} | user=${order.userId} | amount=NGN ${entry.grossAmount} | provider=${provider}`);
    written++;
  }

  console.log(`\nDone. Written: ${written} | Skipped: ${skipped}`);

  // Verify
  console.log('\n--- user-side query after backfill ---');
  const userHidden = ['platform_earning', 'provider_fee', 'item_budget_spent'];
  const userEntries = await ledger.find({ userModel: 'User', type: { $nin: userHidden } }).sort({ createdAt: 1 }).toArray();
  console.log(`User-visible entries (${userEntries.length}):`);
  userEntries.forEach(e => {
    console.log(`  userId=${e.userId} | type=${e.type} | orderId=${e.orderId} | amount=${e.grossAmount}`);
  });

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });