const express = require('express');
const router = express.Router();
const referralController = require('../../controllers/referralController');

router.get('/get-all-referrals', referralController.getAllReferrals);
router.get('/get-referrals-config', referralController.getConfig);
router.patch('/update-referrals-config', referralController.updateConfig);

module.exports = router;