// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticate, authenticateOptional } = require('../middleware/auth');

// Validate current session - uses optional auth (won't fail if token expired)
router.post('/validate', authenticateOptional, sessionController.validateSession);

// Refresh session token for active order
router.post('/refresh', authenticateOptional, sessionController.refreshSession);

// Get active session info (no auth required - public check)
router.get('/active/:userId/:chatId', sessionController.getActiveSession);

module.exports = router;