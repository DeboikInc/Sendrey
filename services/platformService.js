const { resolveBankCode } = require('../utils/platformBankResolver');
const PlatformSettings = require('../models/PlatformSettings');

class PlatformService {
  async getActive() {
    return PlatformSettings.findOne({ key: 'active' }).lean();
  }

  async updateBankAccount(accountNumber) {
    const { bankName, accountName } = await resolveBankCode(accountNumber);

    return PlatformSettings.findOneAndUpdate(
      { key: 'active' },
      { $set: { platformBankAccount: accountNumber, bankName, accountName } },
      { new: true }
    );
  }
}

module.exports = new PlatformService();