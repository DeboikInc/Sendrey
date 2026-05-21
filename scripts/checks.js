require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;

  // Find all wallets where a runner exists but userType is wrong
  const runners = await db.collection('runners').find({}, { projection: { _id: 1 } }).toArray();
  const runnerIds = runners.map(r => r._id.toString());

  const badWallets = await db.collection('wallets').find({
    $or: [
      { userId: { $in: runnerIds } },
      { userId: { $in: runners.map(r => r._id) } },
    ],
    userType: { $ne: 'runner' }
  }).toArray();

  console.log(`Found ${badWallets.length} runner wallets with wrong userType:`);
  badWallets.forEach(w => console.log(`  walletId=${w._id} userId=${w.userId} userType=${w.userType} balance=${w._balance ?? w.balance}`));

  if (!badWallets.length) {
    console.log('No bad wallets found.');
    await mongoose.disconnect();
    return;
  }

  for (const w of badWallets) {
    await db.collection('wallets').updateOne(
      { _id: w._id },
      { $set: { userType: 'runner' } }
    );
    console.log(`✅ Fixed wallet ${w._id} for runner ${w.userId}`);
  }

  console.log('\nDone. Re-run diagnose-payout.js to confirm.');
  await mongoose.disconnect();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });