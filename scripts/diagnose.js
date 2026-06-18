const mongoose = require('mongoose');
require('dotenv').config();

const PRESERVE = ['users']; // keep admins/users intact

const run = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('❌ DATABASE_URL is undefined. Check your .env is being loaded.');
    process.exit(1);
  }

  const conn = await mongoose.createConnection(url).asPromise();

  console.log('Connected db name:', conn.name);
  console.log('Preserving:', PRESERVE.join(', ') || '(none)');
  console.log('---');

  const collections = await conn.db.listCollections().toArray();

  for (const col of collections) {
    if (PRESERVE.includes(col.name)) {
      const count = await conn.db.collection(col.name).countDocuments();
      console.log(`SKIPPED ${col.name} (${count} documents preserved)`);
      continue;
    }

    const before = await conn.db.collection(col.name).countDocuments();
    const result = await conn.db.collection(col.name).deleteMany({});
    const after = await conn.db.collection(col.name).countDocuments();

    console.log(`${col.name}: ${before} → ${after} (deleted ${result.deletedCount})`);
  }

  console.log('---');
  console.log('Wipe complete.');

  await conn.close();
  process.exit(0);
};

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});