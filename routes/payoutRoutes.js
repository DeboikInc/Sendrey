// payoutRoutes
const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const { authenticate, authorize, auditLog } = require('../middleware/auth'); 
const {isRunner} = require('../middleware/roleCheck')

// ─── Runner routes (must be authenticated runner) ─────────────────────────────
router.use(isRunner);

router.get(
    '/current', 
    authenticate, 
    auditLog('RUNNER_PAYOUT'),
    payoutController.getRunnerPayout);

router.get(
    '/history', 
    authenticate, 
    auditLog('PAYOUT_HISTORY'),
    payoutController.getPayoutHistory);

router.get(
    '/receipts', 
    authenticate, 
    auditLog('RECEIPTS'),
    payoutController.getRunnerReceipts);

router.post(
    '/submit-receipt', 
    authenticate, 
    auditLog('SUBMIT_RECEIPTS'),
    payoutController.submitReceipt);

router.post(
    '/transfer-to-vendor', 
    authenticate, 
    auditLog('TRANSFER_TO_VENDOR'),
    payoutController.transferToVendor);


module.exports = router;