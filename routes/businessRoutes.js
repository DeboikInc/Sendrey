// routes/businessRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, auditLog, userRateLimit } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/roleCheck');
const controller = require('../controllers/businessController');

router.use(authenticate);
// prefix /business
// ── Conversion ────────────────────────────────────────────────────────────────
router.post('/convert',
  userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 }),
  auditLog('CONVERT_TO_BUSINESS'),
  controller.convertToBusiness);

// ── Suggestions
router.get('/suggestion/status',
  auditLog('GET_BUSINESS_SUGGESTION_STATUS'),
  controller.getStatus);

router.post('/suggestion/dismiss',
  auditLog('DISMISS_BUSINESS_SUGGESTION'),
  controller.dismiss);

router.post('/suggestion/acknowledge',
  auditLog('ACKNOWLEDGE_BUSINESS_SUGGESTION'),
  controller.acknowledge);

// ── Team 
router.get('/team',
  requireBusiness(),
  auditLog('GET_TEAM_MEMBERS'),
  controller.getTeamMembers);

router.post('/team/invite',
  userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }),
  requireBusiness(['admin']),
  auditLog('INVITE_TEAM_MEMBER'),
  controller.inviteMember);

router.delete('/team/:memberId',
  requireBusiness(['admin']),
  auditLog('REMOVE_TEAM_MEMBER'),
  controller.removeMember);

// ── Reports
router.get('/reports',
  userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 }),
  requireBusiness(['admin', 'manager']),
  auditLog('GET_EXPENSE_REPORTS'),
  controller.getReports);

router.post('/reports/generate',
  requireBusiness(['admin', 'manager']),
  auditLog('GENERATE_EXPENSE_REPORT'),
  controller.generateExpenseReport);

// ── Schedules 
router.post('/schedules',
  userRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }),
  requireBusiness(['admin']),
  auditLog('CREATE_SCHEDULE'),
  controller.createSchedule);

router.delete('/schedules/:scheduleId',
  requireBusiness(['admin']),
  auditLog('DELETE_SCHEDULE'),
  controller.deleteSchedule);

module.exports = router;