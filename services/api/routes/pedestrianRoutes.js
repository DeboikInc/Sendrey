// used by client for live distance config for pedestrian runners
const express = require('express');
const router = express.Router();
const distanceConfigService = require('../services/distanceConfigService');

router.get('/config', async (req, res) => {
  try {
    const config = await distanceConfigService.getRawMatchingConfig();
    
    res.json({
      pedestrianMaxRunnerLeg: config.pedestrianMaxRunnerLeg,
      pedestrianMaxDeliveryLeg: config.pedestrianMaxDeliveryLeg,
      pedestrianTotalMax: config.pedestrianTotalMax,
    });
  } catch (err) {
    console.error('[Config API] Error fetching pedestrian config:', err);
    res.status(500).json({ error: 'Failed to fetch pedestrian config' });
  }
});

module.exports = router;