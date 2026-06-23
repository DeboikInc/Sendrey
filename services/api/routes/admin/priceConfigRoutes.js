const express = require('express');
const router = express.Router();
const PricingConfig = require('../../models/PricingConfig');
const redis = require('../../config/redis');

// GET current pricing config (admin view — includes version/updatedBy/timestamps)
router.get('/pricing-config', /* requireAdmin, */ async (req, res) => {
  try {
    const config = await PricingConfig.findOne({ key: 'active' }).lean();
    if (!config) {
      return res.status(404).json({ message: 'No active pricing config found. Run the seed script.' });
    }
    res.status(200).json(config);
  } catch (err) {
    console.error('[admin/pricing-config] GET failed:', err);
    res.status(500).json({ message: 'Failed to fetch pricing config' });
  }
});

// PUT — full replace of the editable fields. Validates shape before saving.
router.put('/pricing-config', /* requireAdmin, */ async (req, res) => {
  try {
    const {
      platformFeePercentage,
      platformFeePercentagePedestrian,
      paystackFeePercent,
      paystackFeeCap,
      pedestrianTiers,
      fleetRules,
    } = req.body;

    // Basic shape/type validation — reject silently-wrong data before it hits the DB
    const numericFields = { platformFeePercentage, platformFeePercentagePedestrian, paystackFeePercent, paystackFeeCap };
    for (const [key, val] of Object.entries(numericFields)) {
      if (typeof val !== 'number' || Number.isNaN(val)) {
        return res.status(400).json({ message: `${key} must be a number` });
      }
    }

    if (!Array.isArray(pedestrianTiers) || pedestrianTiers.length === 0) {
      return res.status(400).json({ message: 'pedestrianTiers must be a non-empty array' });
    }
    for (const tier of pedestrianTiers) {
      if (typeof tier.maxDistanceMeters !== 'number' || typeof tier.fee !== 'number') {
        return res.status(400).json({ message: 'Each pedestrianTier needs numeric maxDistanceMeters and fee' });
      }
    }
    // Enforce ascending order — the engine's tier lookup depends on this
    const sortedTiers = [...pedestrianTiers].sort((a, b) => a.maxDistanceMeters - b.maxDistanceMeters);

    const requiredFleets = ['bike', 'cycling', 'car', 'van', 'default'];
    if (!fleetRules || typeof fleetRules !== 'object') {
      return res.status(400).json({ message: 'fleetRules object is required' });
    }
    for (const fleet of requiredFleets) {
      const rule = fleetRules[fleet];
      if (!rule || typeof rule.baseFee !== 'number' || typeof rule.ratePerKm !== 'number') {
        return res.status(400).json({ message: `fleetRules.${fleet} needs numeric baseFee and ratePerKm` });
      }
    }

    const existing = await PricingConfig.findOne({ key: 'active' });
    if (!existing) {
      return res.status(404).json({ message: 'No active pricing config found. Run the seed script first.' });
    }

    existing.platformFeePercentage = platformFeePercentage;
    existing.platformFeePercentagePedestrian = platformFeePercentagePedestrian;
    existing.paystackFeePercent = paystackFeePercent;
    existing.paystackFeeCap = paystackFeeCap;
    existing.pedestrianTiers = sortedTiers;
    existing.fleetRules = fleetRules;
    existing.version += 1;
    existing.updatedBy = req.admin?._id; // adjust to however your admin auth attaches the user

    await existing.save();

    // Invalidate the server's in-memory cache across the cluster (if running multiple instances)
    await redis.getPublisher().publish('pricing:updated', JSON.stringify({ version: existing.version }));

    res.status(200).json(existing);
  } catch (err) {
    console.error('[admin/pricing-config] PUT failed:', err);
    res.status(500).json({ message: 'Failed to update pricing config' });
  }
});

module.exports = router;