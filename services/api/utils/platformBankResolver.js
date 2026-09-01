const paystack = require('../config/paystack');
const PlatformSettings = require('../models/PlatformSettings');
const logger = require('../utils/logger');

let cachedBankCode = null;
let cachedAccountNumber = null;
let cachedRecipientCode = null;

/**
 * Fetch bank code from Paystack by resolving the account number.
 * Paystack's /bank/resolve endpoint returns account name and bank details.
 * We need to match against the bank list to get the code.
 */
async function resolveBankCode(accountNumber, bankCode) {
  if (!bankCode) throw new Error('bankCode is required to resolve an account');

  let banksRes;
  try {
    banksRes = await paystack.getBanks();
  } catch (err) {
    logger.error('[platformBank] getBanks failed', {
      message: err.message,
      paystackError: err.response?.data,
    });
    throw new Error(err.response?.data?.message || 'Failed to fetch banks from Paystack');
  }
  if (!banksRes?.data) throw new Error('Failed to fetch banks from Paystack');

  const bank = banksRes.data.find((b) => b.code === bankCode);
  if (!bank) throw new Error(`Unknown bank code: ${bankCode}`);

  let resolved;
  try {
    resolved = await paystack.verifyAccountNumber({
      account_number: accountNumber,
      bank_code: bankCode,
    });
  } catch (err) {
    logger.error('[platformBank] resolveAccount failed', {
      accountNumber,
      bankCode,
      bankName: bank.name,
      message: err.message,
      paystackError: err.response?.data,
    });
    throw new Error(err.response?.data?.message || `Could not resolve account at ${bank.name}`);
  }

  if (resolved?.data?.account_number !== accountNumber) {
    throw new Error(`Could not verify account number ${accountNumber} at ${bank.name}`);
  }

  logger.info(`[platformBank] Resolved: ${resolved.data.account_name}, bank: ${bank.name} (${bankCode})`);
  return { bankCode, bankName: bank.name, accountName: resolved.data.account_name };
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
  const bankCode = settings.bankCode;

  // Return cached recipient if account number hasn't changed
  if (cachedRecipientCode && cachedAccountNumber === accountNumber) {
    return cachedRecipientCode;
  }

  // Resolve bank code from Paystack
  const { accountName } = await resolveBankCode(accountNumber, bankCode);

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

  logger.info(`[platformBank] Recipient created: ${cachedRecipientCode}`);
  return cachedRecipientCode;
}

function invalidatePlatformRecipientCache() {
  cachedRecipientCode = null;
  cachedAccountNumber = null;
  cachedBankCode = null;
  console.log('[platformBank] Cache invalidated');
}

module.exports = { getOrCreatePlatformRecipient, invalidatePlatformRecipientCache, resolveBankCode };