const express = require('express');
const router = express.Router();
const { getPricingConfig } = require('../services/pricingService');

router.get('/pricing-config', async (req, res) => {
  try {
    const config = await getPricingConfig();
    // Strip internal/admin-only fields before sending to client
    const { key, updatedBy, _id, __v, ...publicConfig } = config;
    res.status(200).json(publicConfig);
  } catch (err) {
    console.error('[pricing-config] Failed to load config:', err);
    res.status(503).json({ message: 'Pricing config unavailable' });
  }
});

module.exports = router;