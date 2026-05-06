const mongoose = require('mongoose');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const RUNNER_ID = process.argv[2] || '69df618d3cc6528b16453805';

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to MongoDB\n');

  const db = mongoose.connection.db;
  const col = db.collection('ledgerentries');

  const asObjectId = new mongoose.Types.ObjectId(RUNNER_ID);

  const [
    byStringUserId,
    byObjectIdUserId,
    byStringRunnerId,
    byObjectIdRunnerId,
    total,
  ] = await Promise.all([
    col.find({ userId: RUNNER_ID }).toArray(),
    col.find({ userId: asObjectId }).toArray(),
    col.find({ runnerId: RUNNER_ID }).toArray(),
    col.find({ runnerId: asObjectId }).toArray(),
    col.countDocuments(),
  ]);

  console.log('=== LEDGER DIAGNOSTIC ===');
  console.log(`Total ledger entries in collection: ${total}`);
  console.log(`Runner ID being checked: ${RUNNER_ID}\n`);

  console.log(`userId (string match):   ${byStringUserId.length}`);
  console.log(`userId (ObjectId match): ${byObjectIdUserId.length}`);
  console.log(`runnerId (string match):   ${byStringRunnerId.length}`);
  console.log(`runnerId (ObjectId match): ${byObjectIdRunnerId.length}`);

  const allFound = [...byStringUserId, ...byObjectIdUserId, ...byStringRunnerId, ...byObjectIdRunnerId];
  const unique = [...new Map(allFound.map(e => [e._id.toString(), e])).values()];

  if (unique.length === 0) {
    console.log('\n❌ NO ledger entries found for this runner at all.');
    console.log('   → payoutToRunner likely never ran, or transaction rolled back.');
    console.log('   → Check if any orders were completed for this runner.\n');

    // Show a sample of what IS in the collection
    const sample = await col.find({}).limit(3).toArray();
    console.log('Sample entries from collection (to check field shapes):');
    sample.forEach(e => console.log(JSON.stringify({
      _id: e._id,
      userId: e.userId,
      userIdType: typeof e.userId,
      userModel: e.userModel,
      type: e.type,
      runnerId: e.runnerId,
    }, null, 2)));
  } else {
    console.log(`\n✅ Found ${unique.length} unique entries. Details:\n`);
    unique.forEach(e => console.log(JSON.stringify({
      _id: e._id,
      userId: e.userId,
      userIdType: typeof e.userId,
      userModel: e.userModel,
      type: e.type,
      grossAmount: e.grossAmount,
      description: e.description,
      createdAt: e.createdAt,
    }, null, 2)));
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });