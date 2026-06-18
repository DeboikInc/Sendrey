require('dotenv').config();
const mongoose = require('mongoose');
const LedgerEntry = require('../models/LedgerEntry');

async function run() {
    await mongoose.connect(process.env.DATABASE_URL);

    // Check ALL ledger entries for this user around payment time
    const entries = await LedgerEntry.find({
        userId: '69df1fe656fa039dfc8f3f09',
        userModel: 'User',
        createdAt: {
            $gte: new Date('2026-05-26T03:40:00Z'),
            $lte: new Date('2026-05-26T04:00:00Z'),
        }
    }).lean();

    console.log(`Found ${entries.length} user entries around payment time:`);
    entries.forEach(e => console.log({
        type: e.type,
        grossAmount: e.grossAmount,
        orderId: e.orderId,
        provider: e.provider,
        description: e.description,
        createdAt: e.createdAt,
    }));

    // Also check if escrow paymentStatus is 'unpaid' — that's the smoking gun
    const Escrow = require('../models/Escrows');
    const escrow = await Escrow.findById('6a15185d84441d5daa068326').lean();
    console.log('\nEscrow paymentStatus:', escrow?.paymentStatus);
    console.log('Escrow provider/reference fields:', {
        paystackReference: escrow?.paystackReference,
        paymentMethod: escrow?.paymentMethod,
    });

    await mongoose.disconnect();
}

run().catch(console.error);