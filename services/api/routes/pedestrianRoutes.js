// used by client for live distance config for pedestrian runners
const express = require('express');
const router = express.Router();
const { getMatchingConfig } = require('../services/distanceConfigService');

router.get('/config', async (req, res) => {
  try {
    const config = await getMatchingConfig();
    res.json({
      pedestrianMaxRunnerLeg: config.pedestrianMaxRunnerLeg,
      pedestrianMaxDeliveryLeg: config.pedestrianMaxDeliveryLeg,
      pedestrianTotalMax: config.pedestrianTotalMax,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pedestrian config' });
  }
});

module.exports = router;