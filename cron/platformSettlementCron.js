/**
 * platformSettlementCron.js
 * 
 * Runs daily at midnight — sweeps all pending platform earnings
 * and transfers them to your Paystack account via bulk transfer.
 */

const cron = require('node-cron');
const PlatformEarnings = require('../models/PlatformEarnings');
const paystack = require('../config/paystack');

const PLATFORM_BANK_ACCOUNT_NUMBER = process.env.PLATFORM_BANK_ACCOUNT_NUMBER;
const PLATFORM_BANK_CODE = process.env.PLATFORM_BANK_CODE;

let cachedRecipientCode = null;

const getOrCreatePlatformRecipient = async () => {
  if (cachedRecipientCode) return cachedRecipientCode;

  if (!PLATFORM_BANK_ACCOUNT_NUMBER || !PLATFORM_BANK_CODE) {
    throw new Error('PLATFORM_BANK_ACCOUNT_NUMBER or PLATFORM_BANK_CODE not set in env.');
  }

  const recipient = await paystack.createTransferRecipient({
    type: 'nuban',
    name: 'Sendrey Platform',
    account_number: PLATFORM_BANK_ACCOUNT_NUMBER,
    bank_code: PLATFORM_BANK_CODE,
    currency: 'NGN',
  });

  if (!recipient.status || !recipient.data) {
    throw new Error('Failed to create platform transfer recipient');
  }

  cachedRecipientCode = recipient.data.recipient_code;
  console.log('Platform transfer recipient created:', cachedRecipientCode);
  return cachedRecipientCode;
};

const settlePlatformEarnings = async () => {
  console.log(' Platform settlement cron started...');

  try {
    // Get all unsettled platform earnings
    const pending = await PlatformEarnings.find({ status: 'pending' });

    if (pending.length === 0) {
      // console.log('No pending platform earnings to settle.');
      return;
    }

    const totalAmount = pending.reduce((sum, e) => sum + e.amount, 0);

    if (totalAmount < 100) {
      return;
    }

    let recipientCode;
    try {
      recipientCode = await getOrCreatePlatformRecipient();
    } catch (err) {
      console.error('Could not resolve platform recipient. Skipping transfer:', err.message);
      return;
    }

    // Initiate Paystack transfer
    const transfer = await paystack.initiateTransfer({
      source: 'balance',
      recipient: recipientCode,
      amount: totalAmount * 100, // Paystack uses kobo
      reason: `Platform fees settlement - ${new Date().toISOString().split('T')[0]} - ${pending.length} orders`,
      currency: 'NGN',
    });

    const transferCode = transfer?.data?.transfer_code || null;

    // Mark all as settled
    const ids = pending.map(e => e._id);
    await PlatformEarnings.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: 'settled',
          settledAt: new Date(),
          paystackTransferCode: transferCode,
        }
      }
    );

    console.log(`✅ Platform settlement complete: ₦${totalAmount.toLocaleString()} transferred. Code: ${transferCode}`);

  } catch (error) {
    console.error('❌ Platform settlement cron failed:', error.message);
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
// node -e "require('./config/paystack').getBanks().then(r => console.log(r.data.filter(b => b.name.toLowerCase().includes('gtbank'))))"