// paymentRoutes
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, auditLog, userRateLimit } = require('../middleware/auth');
const { checkTransactionLimits, checkFraudIndicators } = require('../middleware/transactionLimits');
const { isUser, isRunner } = require('../middleware/roleCheck');

router.post(
    '/intent',
    authenticate,
    isUser,
    auditLog('CREATE_PAYMENT_INTENTION'),
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }),
    paymentController.createPaymentIntent);

router.post(
    '/verify',
    authenticate,
    isUser,
    auditLog('VERIFY_PAYMENT'),
    paymentController.verifyPayment);

router.post(
    '/wallet/fund',
    authenticate,
    isUser,
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }), // 10/hr
    checkTransactionLimits,
    checkFraudIndicators,
    auditLog('FUND_WALLET'),
    paymentController.fundWallet);

router.post(
    '/wallet/virtual-account',
    authenticate,
    isUser,
    userRateLimit({ windowMs: 24 * 60 * 60 * 1000, maxRequests: 3 }), // 3 per day
    auditLog('CREATE_VIRTUAL_ACCOUNT'),
    paymentController.createVirtualAccount);

router.post(
    '/wallet/withdraw',
    authenticate,
    isRunner,
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 }), // 5/hr
    checkTransactionLimits,
    checkFraudIndicators,
    auditLog('WITHDRAW_FROM_WALLET'),
    paymentController.withdrawFromWallet);

router.post(
    '/wallet/verify-account',
    authenticate,
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }),
    auditLog('VERIFY_ACCOUNT'),
    paymentController.verifyAccount);

router.post('/webhook', paymentController.handleWebhook);


router.get(
    '/wallet/balance',
    authenticate,
    auditLog('GET_WALLET_BALANCE'),
    paymentController.getWalletBalance);

router.get(
    '/wallet/transactions',
    authenticate,
    auditLog('GET_TRANSACTION_HISTORY'),
    paymentController.getTransactionHistory);

router.get('/wallet/banks', authenticate, paymentController.getBanks);

router.post(
    '/wallet/verify-funding', 
    authenticate, 
    isUser,
    auditLog('VERIFY_WALLET_FUNDING'), 
    paymentController.verifyWalletFunding
);

// escrow routes
router.post(
    '/escrow/create',
    authenticate,
    isUser,
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20 }), // 20/hr
    checkFraudIndicators,
    auditLog('CREATE_ESCROW'),
    paymentController.createTaskEscrow); // Create & lock escrow when funding task

router.post(
    '/escrow/:escrowId/release',
    authenticate,
    auditLog('RELEASE_ESCROW'),
    paymentController.releaseEscrow); // Release funds to runner

router.post(
    '/escrow/timeouts',
    paymentController.checkEscrowTimeouts); // Cron job to check for escrow timeouts and auto-release if needed

router.post(
    '/escrow/:escrowId/release-items',
    authenticate,
    auditLog('RELEASE_ITEM_BUDEGET'),
    paymentController.releaseItemBudget);

module.exports = router;
