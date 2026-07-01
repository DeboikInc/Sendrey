/**
 * platformSettlementCron.js
 * 
 * Runs daily at midnight — sweeps all pending platform earnings
 * and transfers them to your Paystack account via bulk transfer.
 */
const { getOrCreatePlatformRecipient } = require('../utils/platformBankResolver');
const cron = require('node-cron');
const PlatformEarnings = require('../models/PlatformEarnings');
const paystack = require('../config/paystack');

const settlePlatformEarnings = async () => {
  console.log('Platform settlement cron started...');

  try {
    const pending = await PlatformEarnings.find({ status: 'pending' });
    if (pending.length === 0) return;

    const totalAmount = pending.reduce((sum, e) => sum + e.amount, 0);
    if (totalAmount < 100) return;

    let recipientCode;
    try {
      recipientCode = await getOrCreatePlatformRecipient();
    } catch (err) {
      console.error('Could not resolve platform recipient. Skipping transfer:', err.message);
      return;
    }

    const transfer = await paystack.initiateTransfer({
      source: 'balance',
      recipient: recipientCode,
      amount: totalAmount * 100,
      reason: `Platform fees settlement - ${new Date().toISOString().split('T')[0]} - ${pending.length} orders`,
      currency: 'NGN',
    });

    const transferCode = transfer?.data?.transfer_code || null;
    const ids = pending.map(e => e._id);

    await PlatformEarnings.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'settled', settledAt: new Date(), paystackTransferCode: transferCode } }
    );

    console.log(`✅ Platform settlement complete: ₦${totalAmount.toLocaleString()} transferred. Code: ${transferCode}`);
  } catch (error) {
    console.error('Platform settlement cron failed:', error.message);
  }
};

const startPlatformSettlementCron = () => {
  // Runs every day at midnight
  cron.schedule('0 0 * * *', settlePlatformEarnings, {
    timezone: 'Africa/Lagos'
  });

  console.log('Platform settlement cron scheduled (daily midnight Lagos time)');
};

// Allow manual trigger for testing
const runSettlementNow = settlePlatformEarnings;

module.exports = { startPlatformSettlementCron, runSettlementNow };