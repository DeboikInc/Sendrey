const PricingConfig = require('../models/PricingConfig');
const redis = require('../config/redis');

let cachedConfig = null;
let loadingPromise = null;

async function loadFromDb() {
  const doc = await PricingConfig.findOne({ key: 'active' }).lean();
  if (!doc) {
    throw new Error('[pricingService] No active PricingConfig found in DB — run the seed script.');
  }
  return doc;
}

async function getPricingConfig() {
  if (cachedConfig) return cachedConfig;

  // Avoid duplicate concurrent DB reads if many requests hit this before the first resolves
  if (!loadingPromise) {
    loadingPromise = loadFromDb()
      .then((doc) => {
        cachedConfig = doc;
        return doc;
      })
      .finally(() => {
        loadingPromise = null;
      });
  }
  return loadingPromise;
}

function invalidatePricingConfig() {
  cachedConfig = null;
  console.log('[pricingService] Cache invalidated — next call will refetch from DB');
}

// Call once at server startup, after redis.connect()
async function initPricingConfigSubscriber() {
  await getPricingConfig(); // warm the cache on boot

  const subscriber = redis.getSubscriber();
  await subscriber.subscribe('pricing:updated', (err, count) => {
    if (err) {
      console.error('[pricingService] Failed to subscribe to pricing:updated:', err);
    } else {
      console.log(`✅ Subscribed to pricing:updated (${count} channels)`);
    }
  });

  subscriber.on('message', (channel) => {
    if (channel === 'pricing:updated') {
      console.log('[pricingService] Received pricing:updated — invalidating cache');
      invalidatePricingConfig();
    }
  });
}

module.exports = {
  getPricingConfig,
  invalidatePricingConfig,
  initPricingConfigSubscriber,
};