// controllers/distanceConfigController.js
const BaseController = require('./baseController');
const distanceConfigService = require('../services/distanceConfigService');
const {
  getMatchingConfig,
  invalidateMatchingConfig,
  initMatchingConfigSubscriber,
  updateMatchingConfig,
  getRawMatchingConfig,
  updateMatchingDistanceCaps,
} = distanceConfigService;

class DistanceConfigController extends BaseController {
  constructor() {
    super(distanceConfigService);
    this.getMatchingConfig = getMatchingConfig;
    this.invalidateMatchingConfig = invalidateMatchingConfig;
    this.initMatchingConfigSubscriber = initMatchingConfigSubscriber;
    this.updateMatchingConfig = updateMatchingConfig;
    this.getRawMatchingConfig = getRawMatchingConfig;
    this.updateMatchingDistanceCaps = updateMatchingDistanceCaps;
  }

  // GET /get-pedestrian-config
  getPedestrianConfig = async (req, res, next) => {
    try {
      const config = await getMatchingConfig();
      return this.success(res, config);
    } catch (err) {
      next(err);
    }
  };

  // PUT /update-pedestrian-config
  updatePedestrianConfig = async (req, res, next) => {
    try {
      const config = await updateMatchingConfig(req.body, req.user?._id);
      if (!config) return this.notFound(res, 'Matching config not found');
      return this.success(res, config, 'Matching config updated');
    } catch (err) {
      if (err.statusCode === 400) return this.badRequest(res, err.message);
      next(err);
    }
  };

  // GET /get-matching-config
  getDistanceCapsConfig = async (req, res, next) => {
    try {
      const config = await getRawMatchingConfig();
      if (!config) return this.notFound(res, 'No active matching config found. Run the seed script.');
      return this.success(res, config);
    } catch (err) {
      next(err);
    }
  };

  // PUT /put-matching-config
  updateDistanceCapsConfig = async (req, res, next) => {
    try {
      const { pickupMaxDistance, totalMaxDistance } = req.body;

      const numericFields = { pickupMaxDistance, totalMaxDistance };
      for (const [key, val] of Object.entries(numericFields)) {
        if (typeof val !== 'number' || Number.isNaN(val) || val < 0) {
          return this.badRequest(res, `${key} must be a non-negative number`);
        }
      }

      const config = await updateMatchingDistanceCaps(pickupMaxDistance, totalMaxDistance, req.admin?._id);
      if (!config) return this.notFound(res, 'No active matching config found. Run the seed script first.');

      return this.success(res, config);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new DistanceConfigController();