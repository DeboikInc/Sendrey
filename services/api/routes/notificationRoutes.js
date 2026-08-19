const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, auditLog, userRateLimit } = require('../middleware/auth');

// Opt in/out for users
router.patch(
    '/users/opt-in/:userId/',
    authenticate,
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 }),
    auditLog('USER_OPT_IN_NOTIFICATION'),
    notificationController.optIn
);

router.patch(
    '/users/opt-out/:userId',
    authenticate,
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 }),
    auditLog('USER_OPT_OUT_NOTIFICATION'),
    notificationController.optOut
);

router.get(
    '/users/preferences/:userId',
    authenticate,
    notificationController.getPreferences
);

// Opt in/out for runners
router.patch(
    '/runners/opt-in/:runnerId',
    authenticate,
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 }),
    auditLog('RUNNER_OPT_IN_NOTIFICATION'),
    notificationController.optIn
);

router.patch(
    '/runners/opt-out/:runnerId',
    authenticate,
    userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 }),
    auditLog('RUNNER_OPT_OUT_NOTIFICATION'),
    notificationController.optOut
);

router.get(
    '/runners/preferences/:runnerId',
    authenticate,
    notificationController.getPreferences
);

module.exports = router;