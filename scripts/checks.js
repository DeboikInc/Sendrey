/**
 * scripts/diagnoseLedger.js
 * Run: node scripts/diagnoseLedger.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connected\n');

  const ledger = mongoose.connection.db.collection('ledgerentries');

  const total = await ledger.countDocuments();
  console.log(`Total ledger entries: ${total}`);

  // breakdown by type + userModel
  const byType = await ledger.aggregate([
    { $group: { _id: { type: '$type', userModel: { $ifNull: ['$userModel', 'MISSING'] } }, count: { $sum: 1 } } },
    { $sort: { '_id.type': 1 } }
  ]).toArray();

  console.log('\nBreakdown by type + userModel:');
  byType.forEach(r => console.log(`  type=${r._id.type} | userModel=${r._id.userModel} | count=${r.count}`));

  // how many missing userModel
  const missingModel = await ledger.countDocuments({ userModel: { $exists: false } });
  console.log(`\nEntries missing userModel entirely: ${missingModel}`);

  // escrow_release specifically
  const releases = await ledger.find({ type: 'escrow_release' }).toArray();
  console.log(`\nAll escrow_release entries (${releases.length}):`);
  releases.forEach(e => {
    console.log(`  userId=${e.userId} | runnerId=${e.runnerId} | userModel=${e.userModel ?? 'MISSING'} | amount=${e.grossAmount}`);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => { console.error(err); process.exit(1); });