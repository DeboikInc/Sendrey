// routes/admin/pricingConfig.js
const express = require('express');
const router = express.Router();
const pricingController = require('../../controllers/pricingController');

router.get('/get-pricing-config', pricingController.getPricingConfigRoute);
router.put('/update-pricing-config', pricingController.updatePricingConfigRoute);

module.exports = router;