const MatchingConfig = require('../models/MatchConfig');
const redis = require('../config/redis');

let cachedConfig = null;
let loadingPromise = null;

async function loadFromDb() {
  const doc = await MatchingConfig.findOne({ key: 'active' }).lean();
  if (!doc) {
    throw new Error('[matchingConfigCache] No active MatchingConfig found in DB — run the seed script.');
  }
  return doc;
}

async function getMatchingConfig() {
  if (cachedConfig) return cachedConfig;

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

function invalidateMatchingConfig() {
  cachedConfig = null;
  console.log('[matchingConfigCache] Cache invalidated — next call will refetch from DB');
}

// Call once at server startup, after redis.connect()
async function initMatchingConfigSubscriber() {
  await getMatchingConfig(); 

  const subscriber = redis.getSubscriber();
  await subscriber.subscribe('matchingConfig:updated', (err, count) => {
    if (err) {
      console.error('[matchingConfigCache] Failed to subscribe to matchingConfig:updated:', err);
    } else {
      console.log(`✅ Subscribed to matchingConfig:updated (${count} channels)`);
    }
  });

  subscriber.on('message', (channel) => {
    if (channel === 'matchingConfig:updated') {
      console.log('[matchingConfigCache] Received matchingConfig:updated — invalidating cache');
      invalidateMatchingConfig();
    }
  });
}

module.exports = {
  getMatchingConfig,
  invalidateMatchingConfig,
  initMatchingConfigSubscriber,
};