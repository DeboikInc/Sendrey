const BaseController = require('./baseController');
const referralService = require('../services/referralService');

class ReferralController extends BaseController {

  getMyReferrals = async (req, res, next) => {
    try {
      const { id, role } = req.user;
      const personModel = role === 'runner' ? 'Runner' : 'User';
      const referrals = await referralService.getMyReferrals(id, personModel);
      return this.success(res, { referrals });
    } catch (err) {
      next(err);
    }
  }

  // ALL ADMINS
  getAllReferrals = async (req, res, next) => {
    try {
      const { status, page, limit } = req.query;
      const result = await referralService.getAllReferrals({
        status,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return this.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  getConfig = async (req, res, next) => {
    try {
      const config = await referralService.getConfig();
      return this.success(res, { config });
    } catch (err) {
      next(err);
    }
  }

  updateConfig = async (req, res, next) => {
    try {
      const { bonusAmount } = req.body;
      if (bonusAmount === undefined) {
        return this.badRequest(res, 'bonusAmount is required');
      }
      const config = await referralService.updateConfig(req.admin.id, bonusAmount);
      return this.success(res, { config });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReferralController();