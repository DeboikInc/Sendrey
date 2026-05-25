// scripts/backfillLedger.js
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.DATABASE_URL);
    const db = mongoose.connection.db;

    await db.collection('ledgerentries').insertOne({
        userId: new mongoose.Types.ObjectId('69fc587312bc0b5b453df47c'), // runnerId
        userModel: 'Runner',
        orderId: 'ORD-MPKRYL5Q-5A0GR',
        escrowId: new mongoose.Types.ObjectId('6a13ca52df34a19aba853ac6'),
        runnerId: new mongoose.Types.ObjectId('69fc587312bc0b5b453df47c'),
        type: 'escrow_release',
        grossAmount: 2548,
        netAmount: 2548,
        platformFee: 0,
        netPlatformFee: 0,
        providerFee: 0,
        runnerFee: 2548,
        provider: 'system',
        description: 'NGN 2548 earned from completed order - ORD-MPKRYL5Q-5A0GR',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    console.log('Backfilled ledger entry for ORD-MPKRYL5Q-5A0GR');
    await mongoose.disconnect();
}

run().catch(console.error);