const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authenticate } = require('../middleware/auth');

// User/runner-facing
router.get(
    '/me',
    authenticate,
    referralController.getMyReferrals
);

module.exports = router;