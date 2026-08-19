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

  async updateBankAccount(accountNumber) {
    const { bankName, accountName } = await resolveBankCode(accountNumber);

    return PlatformSettings.findOneAndUpdate(
      { key: 'active' },
      { $set: { platformBankAccount: accountNumber, bankName, accountName } },
      { new: true, upsert: true }
    );
  }
}

module.exports = new PlatformService();