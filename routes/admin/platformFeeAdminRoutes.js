const express = require('express');
const router = express.Router();
const PlatformFeeController = require('../../controllers/platformFeeController');

router.get('/get-platform-fee-setting',  PlatformFeeController.getSettings);
router.put('/update-platform-fee-bank-account',  PlatformFeeController.updateBankAccount);

module.exports = router;