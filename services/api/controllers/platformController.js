const BaseController = require('./baseController');
const platformService = require('../services/platformService');
const { invalidatePlatformRecipientCache } = require('../utils/platformBankResolver');
const paystack = require('../config/paystack');
const logger = require('../utils/logger');

class PlatformController extends BaseController {
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

  // ── Discount 
  getDiscount = async (req, res, next) => {
    try {
      const discount = await this.platformService.getDiscount();
      return this.success(res, { discount });
    } catch (err) {
      next(err);
    }
  };

  updateDiscount = async (req, res, next) => {
    try {
      console.log('[updateDiscount] body:', JSON.stringify(req.body), typeof req.body.discount);
      const { discount } = req.body;
      
      if (discount === undefined || discount === null || discount === '') {
        return this.badRequest(res, 'discount is required');
      }

      let settings;
      try {
        settings = await this.platformService.updateDiscount(discount, req.admin?.id);
      } catch (validationErr) {
        if (validationErr.status === 400) {
          return this.badRequest(res, validationErr.message);
        }
        throw validationErr;
      }

      logger.info('[platform] discount updated', { discount: settings.discount, adminId: req.admin?.id });
      return this.success(res, { discount: settings.discount }, 'Discount updated');
    } catch (err) {
      next(err);
    }
  };

  // Client: check that the ?discount= value from the URL is currently valid
  applyDiscount = async (req, res, next) => {
    try {
      const { discount, total } = req.query;
      const amount = Number(total);
      if (discount === undefined || !Number.isFinite(amount) || amount < 0) {
        return this.badRequest(res, 'discount and total are required');
      }
      
      const result = await this.platformService.resolveDiscount(discount, amount, req.user.id);
      return this.success(res, result);
    } catch (err) {
      next(err);
    }
  };

  getBanks = async (req, res, next) => {
    try {
      const banks = await paystack.getBanks();
      return this.success(res, banks.data.map(b => ({ code: b.code, name: b.name })));
    } catch (err) {
      next(err);
    }
  };

  updateBankAccount = async (req, res, next) => {
    logger.info('[platform] updateBankAccount request', { body: req.body, adminId: req.admin?.id });
    try {
      const { platformBankAccount, bankCode } = req.body;

      if (!platformBankAccount || !bankCode) {
        return this.badRequest(res, 'platformBankAccount and bank code are required');
      }

      let settings;
      try {
        settings = await this.platformService.updateBankAccount(platformBankAccount, bankCode);
      } catch (resolveErr) {
        logger.warn('[platform] updateBankAccount resolve failed', { message: resolveErr.message });
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

module.exports = new PlatformController(platformService);