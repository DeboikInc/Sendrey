const BaseController = require('./baseController');
const platformService = require('../services/platformService');
const { invalidatePlatformRecipientCache } = require('../utils/platformBankResolver');

class PlatformFeeController extends BaseController {
  constructor(platformService) {
    super(platformService);
    this.platformService = platformService;
  }

  getSettings = async (req, res, next) => {
    try {
      const settings = await this.platformService.getActive();
      if (!settings) return this.notFound(res, 'Platform settings not found');
      return this.success(res, settings);
    } catch (err) {
      next(err);
    }
  };

  updateBankAccount = async (req, res, next) => {
    console.log('body received:', req.body);
    try {
      const { platformBankAccount } = req.body;

      if (!platformBankAccount) {
        return this.badRequest(res, 'platformBankAccount is required');
      }

      let settings;
      try {
        settings = await this.platformService.updateBankAccount(platformBankAccount);
      } catch (resolveErr) {

        return this.badRequest(res, resolveErr.message);
      }

      if (!settings) return this.notFound(res, 'Platform settings not found');

      invalidatePlatformRecipientCache();

      return this.success(res, settings, 'Platform bank account updated');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new PlatformFeeController(platformService);