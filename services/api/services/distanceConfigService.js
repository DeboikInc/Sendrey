// services/distanceConfigService.js
const MatchingConfig = require('../models/MatchConfig');
const redis = require('../config/redis');

class DistanceConfigService {
  constructor() {
    this.cachedPedestrianConfig = null;
    this.pedestrianLoadingPromise = null;

    this.PEDESTRIAN_ALLOWED_FIELDS = [
      'pickupMaxDistance',
      'totalMaxDistance',
      'pedestrianMaxRunnerLeg',
      'pedestrianMaxDeliveryLeg',
      'pedestrianTotalMax',
    ];
  }

  getOrCreatePedestrianConfig = async () => {
    return MatchingConfig.findOneAndUpdate(
      { key: 'active' },
      { $setOnInsert: { key: 'active' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
  };

  loadPedestrianConfigFromDb = async () => {
    return this.getOrCreatePedestrianConfig();
  };

  getPedestrianConfig = async () => {
    if (this.cachedPedestrianConfig) return this.cachedPedestrianConfig;

    if (!this.pedestrianLoadingPromise) {
      this.pedestrianLoadingPromise = this.loadPedestrianConfigFromDb()
        .then((doc) => {
          this.cachedPedestrianConfig = doc;
          return doc;
        })
        .finally(() => {
          this.pedestrianLoadingPromise = null;
        });
    }
    return this.pedestrianLoadingPromise;
  };

  invalidatePedestrianConfig = () => {
    this.cachedPedestrianConfig = null;
    console.log('[pedestrianConfigCache] Cache invalidated — next call will refetch from DB');
  };

  initPedestrianConfigSubscriber = async () => {
    await this.getPedestrianConfig();

    const subscriber = redis.getSubscriber();
    await subscriber.subscribe('matchingConfig:updated', (err, count) => {
      if (err) {
        console.error('[pedestrianConfigCache] Failed to subscribe to matchingConfig:updated:', err);
      } else {
        console.log(`✅ Subscribed to matchingConfig:updated (${count} channels)`);
      }
    });

    subscriber.on('message', (channel) => {
      if (channel === 'matchingConfig:updated') {
        console.log('[pedestrianConfigCache] Received matchingConfig:updated — invalidating cache');
        this.invalidatePedestrianConfig();
      }
    });
  };

  updatePedestrianConfig = async (updates, userId) => {
    const set = {};
    for (const field of this.PEDESTRIAN_ALLOWED_FIELDS) {
      if (updates[field] !== undefined) set[field] = updates[field];
    }
    if (userId) set.updatedBy = userId;

    // If either leg field is being updated, recalculate total
    if (set.pedestrianMaxRunnerLeg || set.pedestrianMaxDeliveryLeg) {
      const current = await this.getPedestrianConfig();
      const runnerLeg = set.pedestrianMaxRunnerLeg ?? current.pedestrianMaxRunnerLeg;
      const deliveryLeg = set.pedestrianMaxDeliveryLeg ?? current.pedestrianMaxDeliveryLeg;
      set.pedestrianTotalMax = runnerLeg + deliveryLeg;
    }

    const config = await MatchingConfig.findOneAndUpdate(
      { key: 'active' },
      { $set: set, $inc: { version: 1 }, $setOnInsert: { key: 'active' } },
      { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
    );

    this.invalidatePedestrianConfig();
    const pub = redis.getPublisher();
    await pub.publish('matchingConfig:updated', JSON.stringify({ updatedAt: new Date() }));

    return config;
  };

  // other fleetTypes
  getRawMatchingConfig = async () => {
    return this.getOrCreatePedestrianConfig();
  };

  updateMatchingDistanceCaps = async (pickupMaxDistance, totalMaxDistance, userId) => {
    let existing = await MatchingConfig.findOne({ key: 'active' });
    if (!existing) {
      existing = await MatchingConfig.create({ key: 'active' });
    }

    existing.pickupMaxDistance = pickupMaxDistance;
    existing.totalMaxDistance = totalMaxDistance;
    existing.version += 1;
    if (userId) existing.updatedBy = userId;

    await existing.save();

    this.invalidatePedestrianConfig();
    await redis.getClient().publish('matchingConfig:updated', JSON.stringify({ version: existing.version }));

    return existing;
  };
}

module.exports = new DistanceConfigService();