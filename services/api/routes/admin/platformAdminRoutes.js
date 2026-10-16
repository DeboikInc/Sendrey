const express = require('express');
const router = express.Router();
const PlatformController = require('../../controllers/platformController');

router.get('/get-platform-fee-setting',  PlatformController.getSettings);
router.put('/update-platform-fee-bank-account', PlatformController.updateBankAccount);
router.get('/get-banks', PlatformController.getBanks);

router.get('/get-platform-discount', PlatformController.getDiscount);
router.put('/update-platform-discount', PlatformController.updateDiscount);

module.exports = router;