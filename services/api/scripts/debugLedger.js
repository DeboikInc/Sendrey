require('dotenv').config();
const mongoose = require('mongoose');
const LedgerEntry = require('../models/LedgerEntry');

async function run() {
    await mongoose.connect(process.env.DATABASE_URL);

    console.log('Before:');
    console.log(await LedgerEntry.collection.indexes());

    try {
        await LedgerEntry.collection.dropIndex('providerReference_1');
        console.log('\nDropped providerReference_1');
    } catch (err) {
        if (err.codeName === 'IndexNotFound') {
            console.log('\nproviderReference_1 not found, skipping drop');
        } else {
            throw err;
        }
    }

    // Rebuilds indexes to match the schema currently loaded in this file
    // (make sure the partialFilterExpression change is already in LedgerEntry.js)
    const result = await LedgerEntry.syncIndexes();
    console.log('\nsyncIndexes result:', result);

    console.log('\nAfter:');
    console.log(await LedgerEntry.collection.indexes());

    await mongoose.disconnect();
}

run().catch(console.error);