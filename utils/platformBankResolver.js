const paystack = require('../config/paystack');
const PlatformSettings = require('../models/PlatformSettings');

let cachedBankCode = null;
let cachedAccountNumber = null;
let cachedRecipientCode = null;

/**
 * Fetch bank code from Paystack by resolving the account number.
 * Paystack's /bank/resolve endpoint returns account name and bank details.
 * We need to match against the bank list to get the code.
 */
async function resolveBankCode(accountNumber) {
  // Get all banks from Paystack
  const banksRes = await paystack.getBanks();
  if (!banksRes?.data) throw new Error('Failed to fetch banks from Paystack');

  // Try resolving against each bank until one works
  for (const bank of banksRes.data) {
    try {
      const resolved = await paystack.resolveAccount({
        account_number: accountNumber,
        bank_code: bank.code,
      });
      if (resolved?.data?.account_number === accountNumber) {
        console.log(`[platformBank] Resolved: ${resolved.data.account_name} — bank: ${bank.name} (${bank.code})`);
        return { bankCode: bank.code, bankName: bank.name, accountName: resolved.data.account_name };
      }
    } catch (_) {
      // not this bank, continue
    }
  }

  throw new Error(`Could not resolve bank code for account number: ${accountNumber}`);
}

/**
 * Get or create the Paystack transfer recipient for the platform account.
 * Fetches account number from DB, resolves bank code, caches recipient code.
 */
async function getOrCreatePlatformRecipient() {
  // Get account number from DB (platform settings)
  const settings = await PlatformSettings.findOne({ key: 'active' }).lean();

  if (!settings?.platformBankAccount) {
    throw new Error('Platform bank account not configured in backoffice settings');
  }

  const accountNumber = settings.platformBankAccount;

  // Return cached recipient if account number hasn't changed
  if (cachedRecipientCode && cachedAccountNumber === accountNumber) {
    return cachedRecipientCode;
  }

  // Resolve bank code from Paystack
  const { bankCode, accountName } = await resolveBankCode(accountNumber);

  // Create transfer recipient
  const recipient = await paystack.createTransferRecipient({
    type: 'nuban',
    name: accountName || 'Sendrey Platform',
    account_number: accountNumber,
    bank_code: bankCode,
    currency: 'NGN',
  });

  if (!recipient.status || !recipient.data) {
    throw new Error('Failed to create platform transfer recipient');
  }

  cachedRecipientCode = recipient.data.recipient_code;
  cachedAccountNumber = accountNumber;
  cachedBankCode = bankCode;

  console.log(`[platformBank] Recipient created: ${cachedRecipientCode}`);
  return cachedRecipientCode;
}

function invalidatePlatformRecipientCache() {
  cachedRecipientCode = null;
  cachedAccountNumber = null;
  cachedBankCode = null;
  console.log('[platformBank] Cache invalidated');
}

module.exports = { getOrCreatePlatformRecipient, invalidatePlatformRecipientCache, resolveBankCode };