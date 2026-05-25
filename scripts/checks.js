require('dotenv').config();
const mongoose = require('mongoose');

const URI = process.env.DATABASE_URL;
if (!URI) { console.error('No DATABASE_URL in env'); process.exit(1); }

mongoose.connect(URI).then(async () => {
  const result = await mongoose.connection.collection('ledgerentries').deleteMany({
    userModel: 'User',
    type: 'escrow_release',
    orderId: { $in: ['ORD-MPKWVZFB-3KBT0', 'ORD-MPKWECST-9XAE6'] },
  });
  console.log('Deleted:', result.deletedCount);
  process.exit();
}).catch(err => { console.error(err); process.exit(1); });