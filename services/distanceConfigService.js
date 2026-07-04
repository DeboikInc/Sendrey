// services/distanceConfigService.js
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

const ALLOWED_FIELDS = [
  'pickupMaxDistance',
  'totalMaxDistance',
  'pedestrianMaxRunnerLeg',
  'pedestrianMaxDeliveryLeg',
  'pedestrianTotalMax',
];

// Used by the pedestrian-config route — full field set, cached read path
async function updateMatchingConfig(updates, userId) {
  const set = {};
  for (const field of ALLOWED_FIELDS) {
    if (updates[field] !== undefined) set[field] = updates[field];
  }
  if (userId) set.updatedBy = userId;

  const pedestrianFields = ['pedestrianMaxRunnerLeg', 'pedestrianMaxDeliveryLeg', 'pedestrianTotalMax'];
  const touchesPedestrianFields = pedestrianFields.some((f) => set[f] !== undefined);

  if (touchesPedestrianFields) {
    const current = await MatchingConfig.findOne({ key: 'active' }).lean();
    if (!current) return null;

    const runnerLeg = set.pedestrianMaxRunnerLeg ?? current.pedestrianMaxRunnerLeg;
    const deliveryLeg = set.pedestrianMaxDeliveryLeg ?? current.pedestrianMaxDeliveryLeg;
    const totalMax = set.pedestrianTotalMax ?? current.pedestrianTotalMax;

    if (runnerLeg + deliveryLeg !== totalMax) {
      const err = new Error(
        `pedestrianMaxRunnerLeg (${runnerLeg}) + pedestrianMaxDeliveryLeg (${deliveryLeg}) must equal pedestrianTotalMax (${totalMax})`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  const config = await MatchingConfig.findOneAndUpdate(
    { key: 'active' },
    { $set: set, $inc: { version: 1 } },
    { new: true, runValidators: true }
  );

  if (!config) return null;

  invalidateMatchingConfig();
  const pub = redis.getPublisher();
  await pub.publish('matchingConfig:updated', JSON.stringify({ updatedAt: new Date() }));

  return config;
}

// Used by the matching-config (distance caps) route — direct DB read, bypasses cache
async function getRawMatchingConfig() {
  return MatchingConfig.findOne({ key: 'active' }).lean();
}

// Used by the matching-config (distance caps) route — only pickupMaxDistance/totalMaxDistance
async function updateMatchingDistanceCaps(pickupMaxDistance, totalMaxDistance, userId) {
  const existing = await MatchingConfig.findOne({ key: 'active' });
  if (!existing) return null;

  existing.pickupMaxDistance = pickupMaxDistance;
  existing.totalMaxDistance = totalMaxDistance;
  existing.version += 1;
  if (userId) existing.updatedBy = userId;

  await existing.save();

  invalidateMatchingConfig();
  await redis.getClient().publish('matchingConfig:updated', JSON.stringify({ version: existing.version }));

  return existing;
}

module.exports = {
  getMatchingConfig,
  invalidateMatchingConfig,
  initMatchingConfigSubscriber,
  updateMatchingConfig,
  getRawMatchingConfig,
  updateMatchingDistanceCaps,
};