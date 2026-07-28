const BaseController = require('./baseController');
const pricingConfigService = require('../services/pricingService');
const {
  getPricingConfig,
  invalidatePricingConfig,
  initPricingConfigSubscriber,
  updatePricingConfig,
} = pricingConfigService;

const REQUIRED_FLEETS = ['bike', 'cycling', 'car', 'van', 'default'];

class PricingConfigController extends BaseController {
  constructor() {
    super(pricingConfigService);
    this.getPricingConfig = getPricingConfig;
    this.invalidatePricingConfig = invalidatePricingConfig;
    this.initPricingConfigSubscriber = initPricingConfigSubscriber;
    this.updatePricingConfig = updatePricingConfig;
  }

  // Validation stays here — service assumes clean input
  validatePricingUpdatePayload = (body) => {
    const {
      platformFeePercentage,
      platformFeePercentagePedestrian,
      paystackFeePercent,
      paystackFeeCap,
      pedestrianTiers,
      fleetRules,
    } = body;

    const numericFields = { platformFeePercentage, platformFeePercentagePedestrian, paystackFeePercent, paystackFeeCap };
    for (const [key, val] of Object.entries(numericFields)) {
      if (typeof val !== 'number' || Number.isNaN(val)) {
        return { error: `${key} must be a number` };
      }
    }

    if (!Array.isArray(pedestrianTiers) || pedestrianTiers.length === 0) {
      return { error: 'pedestrianTiers must be a non-empty array' };
    }
    for (const tier of pedestrianTiers) {
      if (typeof tier.maxDistanceMeters !== 'number' || typeof tier.fee !== 'number') {
        return { error: 'Each pedestrianTier needs numeric maxDistanceMeters and fee' };
      }
    }
    // Enforce ascending order — the engine's tier lookup depends on this
    const sortedTiers = [...pedestrianTiers].sort((a, b) => a.maxDistanceMeters - b.maxDistanceMeters);

    if (!fleetRules || typeof fleetRules !== 'object') {
      return { error: 'fleetRules object is required' };
    }
    for (const fleet of REQUIRED_FLEETS) {
      const rule = fleetRules[fleet];
      if (!rule || typeof rule.baseFee !== 'number' || typeof rule.ratePerKm !== 'number') {
        return { error: `fleetRules.${fleet} needs numeric baseFee and ratePerKm` };
      }
    }

    return {
      data: {
        platformFeePercentage,
        platformFeePercentagePedestrian,
        paystackFeePercent,
        paystackFeeCap,
        pedestrianTiers: sortedTiers,
        fleetRules,
      },
    };
  };

  getPricingConfigRoute = async (req, res, next) => {
    try {
      const config = await getPricingConfig();
      return this.success(res, config);
    } catch (err) {
      next(err);
    }
  };

  updatePricingConfigRoute = async (req, res, next) => {
    try {
      const { error, data } = this.validatePricingUpdatePayload(req.body);
      if (error) return this.badRequest(res, error);

      const config = await updatePricingConfig(data, req.admin?._id);
      return this.success(res, config);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new PricingConfigController();