const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize, auditLog } = require('../middleware/auth');

router.get('/history/runner/:runnerId',
    authenticate,
    auditLog('RUNNERS_ORDERS_HISTORY'),
    authorize(['runner']),
    orderController.getRunnerOrderHistory);

router.get('/history/user/:userId',
    authenticate,
    auditLog('USER_ORDERS_HISTORY'),
    authorize(['user']),
    orderController.getUserOrderHistory);

router.get(
    '/by-chat/:chatId',
    authenticate,
    auditLog('GET_ORDERS_BY_CHAT_ID'),
    orderController.getOrderByChatId);

module.exports = router;