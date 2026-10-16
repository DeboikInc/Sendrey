const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const PlatformController = require('../controllers/platformController');
const { authenticate, authorize, auditLog, userRateLimit } = require('../middleware/auth');

router.use(authenticate);

router.get('/history/runner/:runnerId',
    auditLog('RUNNERS_ORDERS_HISTORY'),
    authorize(['runner']),
    orderController.getRunnerOrderHistory);

router.get('/history/user/:userId',
    auditLog('USER_ORDERS_HISTORY'),
    authorize(['user']),
    orderController.getUserOrderHistory);

router.get(
    '/by-chat/:chatId',
    auditLog('GET_ORDERS_BY_CHAT_ID'),
    orderController.getOrderByChatId);

router.post('/cancel-order/:userId', orderController.cancelOrderByUser);
router.get('/user-cancellation-reasons', orderController.getCancellationReasons);

router.get(
    '/apply-discount',
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }),
    PlatformController.applyDiscount
);

module.exports = router;