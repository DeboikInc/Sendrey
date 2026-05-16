const Order = require('../models/Order');
const { VALID_TRANSITIONS } = require('../models/Order');

// Timestamp map - which field to set for each status
const STATUS_TIMESTAMPS = {
  paid: 'paidAt',
  accepted: 'acceptedAt',
  items_submitted: 'itemsSubmittedAt',
  items_approved: 'itemsApprovedAt',
  delivered: 'deliveredAt',
  completed: 'completedAt',
  disputed: 'disputedAt',
  cancelled: 'cancelledAt',
};

/**
 * Transition order to a new status with validation
 */
const transition = async (orderId, newStatus, {
  triggeredBy = 'system',
  triggeredById = null,
  note = null,
} = {}) => {
  const order = await Order.findOne({ orderId }).sort({ createdAt: -1 });
  if (!order) throw new Error(`Order ${orderId} not found`);

  if (order.status === newStatus) {
    console.log(`Order ${orderId}: already in '${newStatus}', skipping`);
    return order;
  }


  const updated = await order.updateStatus(newStatus, triggeredBy, {
    triggeredById,
    note,
  });

  console.log(`✅ Order ${orderId}: ${order.status} → ${newStatus} (by ${triggeredBy})`);
  return updated;
};

/**
 * Check if a transition is valid without executing it
 */
const canTransition = (currentStatus, newStatus) => {
  const validNext = VALID_TRANSITIONS[currentStatus] || [];
  return validNext.includes(newStatus);
};

/**
 * Get current valid next states for an order
 */
const getValidNextStates = (currentStatus) => {
  return VALID_TRANSITIONS[currentStatus] || [];
};

/**
 * Archive completed/resolved orders (run as cron job)
 */
const archiveOldOrders = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const ordersToArchive = await Order.find({
    status: { $in: ['completed', 'dispute_resolved'] },
    updatedAt: { $lt: thirtyDaysAgo }
  });

  let archived = 0;
  for (const order of ordersToArchive) {
    try {
      await transition(order.orderId, 'archived', {
        triggeredBy: 'system',
        note: 'Auto-archived after 30 days'
      });
      archived++;
    } catch (err) {
      console.error(`Failed to archive order ${order.orderId}:`, err.message);
    }
  }

  console.log(`✅ Archived ${archived} orders`);
  return archived;
};

module.exports = {
  transition,
  canTransition,
  getValidNextStates,
  archiveOldOrders,
  VALID_TRANSITIONS
};