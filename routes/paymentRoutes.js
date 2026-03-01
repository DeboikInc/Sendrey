// paymentRoutes
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, auditLog } = require('../middleware/auth');
const { checkTransactionLimits } = require('../middleware/transactionLimits');


router.post(
    '/intent',
    authenticate,
    auditLog('CREATE_PAYMENT_INTENTION'),
    paymentController.createPaymentIntent);

router.post(
    '/verify',
    authenticate,
    auditLog('VERIFY_PAYMENT'),
    paymentController.verifyPayment);

router.post(
    '/wallet/fund',
    authenticate,
    // checkTransactionLimits,
    auditLog('FUND_WALLET'),
    paymentController.fundWallet);

router.post(
    '/wallet/virtual-account', 
    authenticate, 
    auditLog('CREATE_VIRTUAL_ACCOUNT'),
    paymentController.createVirtualAccount);

router.post(
    '/wallet/withdraw', 
    authenticate, 
    auditLog('WITHDRAW_FROM_WALLET'),
    paymentController.withdrawFromWallet);

router.post(
    '/wallet/verify-account', 
    authenticate, 
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


// escrow routes
router.post(
    '/escrow/create', 
    authenticate, 
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
