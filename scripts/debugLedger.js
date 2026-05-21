const mongoose = require('mongoose');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

const ORDER_ID    = 'ORD-MPFMRIOH-IMWZP';
const ORDER_OID   = '6a0f210ca5bdb99b544f5c3b';
const ESCROW_OID  = '6a0f2124a5bdb99b544f5ca0';
const USER_ID     = '69de878ffce5e7a20b25ab34';
const RUNNER_ID   = '69fc587312bc0b5b453df47c';

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to MongoDB\n');

  const db = mongoose.connection.db;
  const escrows = db.collection('escrows');
  const orders  = db.collection('orders');
  const ledger  = db.collection('ledgerentries');

  // ── 1. Fix escrow: set taskId → orderId string, mark paymentStatus paid ──
  const escrowResult = await escrows.updateOne(
    { _id: new mongoose.Types.ObjectId(ESCROW_OID) },
    {
      $set: {
        taskId:        ORDER_ID,       // was the mongo _id string — fix to orderId
        orderId:       ORDER_ID,       // belt-and-suspenders
        paymentStatus: 'paid',         // was 'unpaid' despite order being paid
        paidAt:        new Date(),
      },
    }
  );
  console.log(`Escrow fixed     : ${escrowResult.modifiedCount} doc modified`);

  // ── 2. Fix order: ensure paidAt and acceptedAt are stamped ───────────────
  const orderResult = await orders.updateOne(
    { orderId: ORDER_ID },
    {
      $set: {
        paidAt:     new Date('2026-05-21T15:13:40.868Z'), // from statusHistory
        acceptedAt: new Date('2026-05-21T15:13:40.868Z'),
      },
    }
  );
  console.log(`Order fixed      : ${orderResult.modifiedCount} doc modified`);

  // ── 3. Create the missing escrow_lock ledger entry ────────────────────────
  const alreadyExists = await ledger.findOne({
    orderId: ORDER_ID,
    type:    'escrow_lock',
  });

  if (alreadyExists) {
    console.log('Ledger entry     : already exists, skipping');
  } else {
    const ledgerResult = await ledger.insertOne({
      userId:      new mongoose.Types.ObjectId(USER_ID),
      runnerId:    new mongoose.Types.ObjectId(RUNNER_ID),
      userModel:   'User',
      type:        'escrow_lock',
      grossAmount: 60330,
      netAmount:   60330,
      description: `Order Payment (Card) for ${ORDER_ID}`,
      orderId:     ORDER_ID,
      escrowId:    new mongoose.Types.ObjectId(ESCROW_OID),
      status:      'completed',
      reference:   null,
      createdAt:   new Date('2026-05-21T15:13:40.868Z'),
      updatedAt:   new Date('2026-05-21T15:13:40.868Z'),
    });
    console.log(`Ledger entry     : created — ${ledgerResult.insertedId}`);
  }

  // ── Verify ────────────────────────────────────────────────────────────────
  console.log('\n=== VERIFICATION ===');

  const fixedEscrow = await escrows.findOne(
    { _id: new mongoose.Types.ObjectId(ESCROW_OID) },
    { projection: { taskId: 1, orderId: 1, paymentStatus: 1, status: 1, paidAt: 1 } }
  );
  console.log('Escrow after fix :', JSON.stringify(fixedEscrow, null, 2));

  const allLedger = await ledger
    .find({ orderId: ORDER_ID })
    .sort({ createdAt: 1 })
    .toArray();
  console.log(`\nLedger entries for ${ORDER_ID} (${allLedger.length}):`);
  allLedger.forEach(e =>
    console.log(`  [${e.type}]  ₦${(e.grossAmount ?? 0).toLocaleString()}  — ${e.description}`)
  );

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });