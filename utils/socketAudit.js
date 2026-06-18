const logger = require('./logger');

/**
 * logSocketAudit — mirrors the auditLog middleware for socket handlers
 * 
 * Usage:
 *   logSocketAudit('PAYMENT_SUCCESS', { runnerId, userId, orderId, amount });
 *   logSocketAudit('SUBMIT_PAYOUT_RECEIPT', { runnerId, chatId, orderId });
 */
const logSocketAudit = (operation, data = {}) => {
    try {
        const auditData = {
            timestamp: new Date().toISOString(),
            operation,
            transport: 'socket',
            ...data,
        };

        logger.audit('AUDIT_LOG', auditData);
    } catch (err) {
        // Never let audit logging crash the handler
        logger.error('logSocketAudit failed:', err);
    }
};

module.exports = { logSocketAudit };