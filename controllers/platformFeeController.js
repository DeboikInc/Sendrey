const BaseController = require('./baseController');
const platformFeeService = require('../services/platformFeeService');
const { invalidatePlatformRecipientCache } = require('../utils/platformBankResolver');

class PlatformFeeController extends BaseController {
  constructor(platformFeeService) {
    super(platformFeeService);
    this.platformFeeService = platformFeeService;
  }

  getSettings = async (req, res, next) => {
    try {
      const settings = await this.platformFeeService.getActive();
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
        settings = await this.platformFeeService.updateBankAccount(platformBankAccount);
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

module.exports = new PlatformFeeController(platformFeeService);