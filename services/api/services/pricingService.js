const PricingConfig = require('../models/PricingConfig');
const redis = require('../config/redis');

class PricingConfigService {
  constructor() {
    this.cachedPricingConfig = null;
    this.pricingLoadingPromise = null;
  }

  getOrCreatePricingConfig = async () => {
    return PricingConfig.findOneAndUpdate(
      { key: 'active' },
      { $setOnInsert: { key: 'active' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
  };

  loadPricingConfigFromDb = async () => {
    return this.getOrCreatePricingConfig();
  };

  getPricingConfig = async () => {
    if (this.cachedPricingConfig) return this.cachedPricingConfig;

    if (!this.pricingLoadingPromise) {
      this.pricingLoadingPromise = this.loadPricingConfigFromDb()
        .then((doc) => {
          this.cachedPricingConfig = doc;
          return doc;
        })
        .finally(() => {
          this.pricingLoadingPromise = null;
        });
    }
    return this.pricingLoadingPromise;
  };

  invalidatePricingConfig = () => {
    this.cachedPricingConfig = null;
    console.log('[pricingConfigCache] Cache invalidated — next call will refetch from DB');
  };

  // Call once at server startup, after redis.connect()
  initPricingConfigSubscriber = async () => {
    await this.getPricingConfig();

    const subscriber = redis.getSubscriber();
    await subscriber.subscribe('pricing:updated', (err, count) => {
      if (err) {
        console.error('[pricingConfigCache] Failed to subscribe to pricing:updated:', err);
      } else {
        console.log(`✅ Subscribed to pricing:updated (${count} channels)`);
      }
    });

    subscriber.on('message', (channel) => {
      if (channel === 'pricing:updated') {
        console.log('[pricingConfigCache] Received pricing:updated — invalidating cache');
        this.invalidatePricingConfig();
      }
    });
  };

  // Expects already-validated, already-sorted input — validation lives in the controller
  updatePricingConfig = async (updates, adminId) => {
    const set = {
      platformFeePercentage: updates.platformFeePercentage,
      platformFeePercentagePedestrian: updates.platformFeePercentagePedestrian,
      paystackFeePercent: updates.paystackFeePercent,
      paystackFeeCap: updates.paystackFeeCap,
      pedestrianTiers: updates.pedestrianTiers,
      fleetRules: updates.fleetRules,
    };
    if (adminId) set.updatedBy = adminId;

    const config = await PricingConfig.findOneAndUpdate(
      { key: 'active' },
      { $set: set, $inc: { version: 1 }, $setOnInsert: { key: 'active' } },
      { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
    );

    this.invalidatePricingConfig();
    await redis.getPublisher().publish('pricing:updated', JSON.stringify({ version: config.version }));

    return config;
  };
}

module.exports = new PricingConfigService();