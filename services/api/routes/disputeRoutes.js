// disputeRoutes
const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/disputeController');
const { authenticate, auditLog, authorize } = require('../middleware/auth');

router.post('/raise',
    authenticate,
    auditLog('RAISE_DISPUTE'),
    disputeController.raiseDispute);

router.get(
    '/get-runner-disputes/:runnerId',
    authenticate,
    auditLog('GET_RUNNER_DISPUTES'),
    disputeController.getRunnerDisputes
);

router.get('/get-user-disputes/:userId',
    authenticate,
    auditLog('GET_USER_DISPUTES'),
    disputeController.getUserDisputes
);

router.get(
    'get-disputes/:orderId',
    auditLog('GET_DISPUTE'),
    authenticate,
    disputeController.getDispute
);

router.get(
    '/order/get-user-dispute-categories',
    authenticate,
    authorize(['user']),
    disputeController.getUserDisputeCategories
);

router.get('/order/get-user-disputable-orders',
    authenticate,
    authorize(['user']),
    disputeController.getDisputableOrders
);

router.get(
    '/order/get-runner-dispute-categories',
    authenticate,
    authorize(['runner']),
    disputeController.getRunnerDisputeCategories
);

router.get('/order/get-runner-disputable-orders',
    authenticate,
    authorize(['runner']),
    disputeController.getDisputableOrders
);

module.exports = router;