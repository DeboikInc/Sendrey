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
    const { bankName, accountName } = await resolveBankCode(accountNumber, bankCode);

    return PlatformSettings.findOneAndUpdate(
      { key: 'active' },
      { $set: { platformBankAccount: accountNumber, bankCode, bankName, accountName } },
      { new: true, upsert: true }
    );
  }
}

module.exports = new PlatformService();