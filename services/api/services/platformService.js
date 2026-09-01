const logger = require('../utils/logger');
const { resolveBankCode } = require('../utils/platformBankResolver');
const PlatformSettings = require('../models/PlatformSettings');

class PlatformService {

  async getActive() {
    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'active' },
      { $setOnInsert: { key: 'active' } },
      { new: true, upsert: true }
    ).lean();
    return settings;
  }

  async updateBankAccount(accountNumber, bankCode) {
    try {
      const { bankName, accountName } = await resolveBankCode(accountNumber, bankCode);

      return await PlatformSettings.findOneAndUpdate(
        { key: 'active' },
        { $set: { platformBankAccount: accountNumber, bankCode, bankName, accountName } },
        { new: true, upsert: true }
      );
    } catch (err) {
      logger.error('[platformService] updateBankAccount failed', {
        accountNumber,
        bankCode,
        message: err.message,
      });
      throw err;
    }
  }
}

module.exports = new PlatformService();