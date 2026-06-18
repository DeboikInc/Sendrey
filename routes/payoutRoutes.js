// payoutRoutes
const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const { authenticate, authorize, auditLog, userRateLimit } = require('../middleware/auth'); 
const {isRunner} = require('../middleware/roleCheck')
const { checkTransactionLimits, checkFraudIndicators } = require('../middleware/transactionLimits');

// ─── Runner routes (must be authenticated runner) ─────────────────────────────
router.use(authenticate);
router.use(isRunner);

router.get(
    '/current', 
    auditLog('RUNNER_PAYOUT'),
    payoutController.getRunnerPayout);

router.get(
    '/history', 
    auditLog('PAYOUT_HISTORY'),
    payoutController.getPayoutHistory);

router.get(
    '/receipts', 
    auditLog('RECEIPTS'),
    payoutController.getRunnerReceipts);

router.post(
    '/submit-receipt', 
    auditLog('SUBMIT_RECEIPTS'),
    payoutController.submitReceipt);

router.post(
    '/transfer-to-vendor', 
    checkTransactionLimits, 
    checkFraudIndicators, 
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 }), // 5 transactions per hour
    auditLog('TRANSFER_TO_VENDOR'),
    payoutController.transferToVendor);


module.exports = router;