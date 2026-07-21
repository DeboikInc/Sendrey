// controllers/distanceConfigController.js
const BaseController = require('./baseController');
const distanceConfigService = require('../services/distanceConfigService');

class DistanceConfigController extends BaseController {
  constructor() {
    super(distanceConfigService);
  }

  getPedestrianConfig = async (req, res, next) => {
    try {
      console.log('[Controller] getPedestrianConfig called');
      const config = await distanceConfigService.getPedestrianConfig();
      console.log('[Controller] Config retrieved:', config);
      return this.success(res, config);
    } catch (err) {
      console.error('[Controller] Error in getPedestrianConfig:', err);
      next(err);
    }
  };

  updatePedestrianConfig = async (req, res, next) => {
    try {
      const config = await distanceConfigService.updatePedestrianConfig(req.body, req.user?._id);
      return this.success(res, config, 'Pedestrian config updated');
    } catch (err) {
      if (err.statusCode === 400) return this.badRequest(res, err.message);
      next(err);
    }
  };

  getDistanceCapsConfig = async (req, res, next) => {
    try {
      const config = await distanceConfigService.getRawMatchingConfig();
      return this.success(res, config);
    } catch (err) {
      next(err);
    }
  };

  updateDistanceCapsConfig = async (req, res, next) => {
    try {
      const { pickupMaxDistance, totalMaxDistance } = req.body;

      const numericFields = { pickupMaxDistance, totalMaxDistance };
      for (const [key, val] of Object.entries(numericFields)) {
        if (typeof val !== 'number' || Number.isNaN(val) || val < 0) {
          return this.badRequest(res, `${key} must be a non-negative number`);
        }
      }

      const config = await distanceConfigService.updateMatchingDistanceCaps(
        pickupMaxDistance, 
        totalMaxDistance, 
        req.admin?._id
      );
      return this.success(res, config);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new DistanceConfigController();