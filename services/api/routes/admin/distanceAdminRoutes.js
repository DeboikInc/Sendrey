const express = require('express');
const router = express.Router();
const MatchingConfig = require('../../models/MatchingConfig');
const redis = require('../../config/redis');

// GET current matching config
router.get('/get-config', async (req, res) => {
  try {
    const config = await MatchingConfig.findOne({ key: 'active' }).lean();
    if (!config) {
      return res.status(404).json({ message: 'No active matching config found. Run the seed script.' });
    }
    res.status(200).json(config);
  } catch (err) {
    console.error('[admin/matching-config] GET failed:', err);
    res.status(500).json({ message: 'Failed to fetch matching config' });
  }
});

// PUT — update the two distance caps
router.put('/put-config', async (req, res) => {
  try {
    const { pickupMaxDistance, totalMaxDistance } = req.body;

    const numericFields = { pickupMaxDistance, totalMaxDistance };
    for (const [key, val] of Object.entries(numericFields)) {
      if (typeof val !== 'number' || Number.isNaN(val) || val < 0) {
        return res.status(400).json({ message: `${key} must be a non-negative number` });
      }
    }

    const existing = await MatchingConfig.findOne({ key: 'active' });
    if (!existing) {
      return res.status(404).json({ message: 'No active matching config found. Run the seed script first.' });
    }

    existing.pickupMaxDistance = pickupMaxDistance;
    existing.totalMaxDistance = totalMaxDistance;
    existing.version += 1;
    // existing.updatedBy = req.admin?._id; // adjust to however your admin auth attaches the user

    await existing.save();

    // Invalidate the server's in-memory cache across the cluster
    await redis.getClient().publish('matchingConfig:updated', JSON.stringify({ version: existing.version }));

    res.status(200).json(existing);
  } catch (err) {
    console.error('[admin/matching-config] PUT failed:', err);
    res.status(500).json({ message: 'Failed to update matching config' });
  }
});

module.exports = router;