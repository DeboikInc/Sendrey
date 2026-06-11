const mongoose = require('mongoose');
require('dotenv').config();

async function resetPayout(orderId) {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected');

    const result = await mongoose.connection.db
        .collection('runnerpayouts')
        .findOneAndUpdate(
            { orderId },
            {
                $set: {
                    status: 'pending',
                    usedPayoutSystem: false,
                    submittedAt: null,
                    receiptUrl: null,
                    vendorName: null,
                    amountSpent: null,
                    changeAmount: null,
                    transferReference: null,
                    transferStatus: null,
                    bankDetails: null,
                    receiptHistory: [],
                }
            },
            { returnDocument: 'after' }
        );

    console.log('status:', result?.value?.status ?? result?.status);
    await mongoose.disconnect();
    console.log('Done');
}

resetPayout('ORD-MQ9AEH77-6JX9N').catch(console.error);