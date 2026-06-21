const admin = require('../config/firebaseAdmin');
const User = require('../models/User');
const Runner = require('../models/Runner');

/**
 * Send push notification to a user or runner.
 * Pass either { recipientId, recipientType, title, body, data }
 * OR a raw FCM token as the first argument (legacy internal usage).
 */
const sendPushNotification = async (recipientIdOrToken, optionsOrUndefined) => {
  // Support legacy call style: sendPushNotification(fcmToken, { title, body, data })
  // used internally by the presence handler for offline/online pushes
  let token, title, body, data;

  if (optionsOrUndefined !== undefined) {
    // Legacy: first arg is a raw FCM token string
    token = recipientIdOrToken;
    ({ title, body, data = {} } = optionsOrUndefined);
  } else {
    // Standard: first arg is an options object
    const { recipientId, recipientType, title: t, body: b, data: d = {} } = recipientIdOrToken;
    title = t;
    body = b;
    data = d;

    try {
      const Model = recipientType === 'runner' ? Runner : User;
      const recipient = await Model.findById(recipientId).select('fcmToken');
      if (!recipient?.fcmToken) {
        console.log(`No FCM token for ${recipientType} ${recipientId}`);
        return null;
      }
      token = recipient.fcmToken;
    } catch (error) {
      console.error('❌ Failed to fetch FCM token:', error.message);
      return null;
    }
  }

  if (!token) return null;

  try {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries({ ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' })
          .map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: data?.type === 'incoming_call' ? 'calls' : 'sendrey_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': data?.type === 'incoming_call' ? '10' : '5',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Push sent [${data?.type || 'general'}]:`, title);
    return response;
  } catch (error) {
    console.error('❌ Push notification failed:', error.message);
    return null;
  }
};

// ─── Notification helpers ─────────────────────────────────────────────────────

const notifyPaymentRequest = async (userId, { orderId, amount }) => {
  return sendPushNotification({
    recipientId: userId,
    recipientType: 'user',
    title: '💳 Payment Required',
    body: `Your runner is ready! Pay ₦${amount?.toLocaleString()} to start your task.`,
    data: { type: 'payment_request', orderId },
  });
};

const notifyPaymentSuccess = async (runnerId, { orderId, amount }) => {
  return sendPushNotification({
    recipientId: runnerId,
    recipientType: 'runner',
    title: '✅ Payment Received',
    body: `Payment of ₦${amount?.toLocaleString()} confirmed. You can start the task!`,
    data: { type: 'payment_success', orderId },
  });
};

const notifyItemApprovalRequest = async (userId, { orderId, totalAmount, itemName, serviceType }) => {
  const isPickup = serviceType === 'pick-up' || serviceType === 'pick_up';
  return sendPushNotification({
    recipientId: userId,
    recipientType: 'user',
    title: isPickup ? 'Item Ready for Approval' : 'Items Ready for Approval',
    body: isPickup
      ? `Your runner has submitted the pickup item${itemName ? ` "${itemName}"` : ''}. Review and approve.`
      : `Your runner has submitted items worth ₦${totalAmount?.toLocaleString()}. Review and approve.`,
    data: { type: 'item_approval_request', orderId },
  });
};

const notifyItemApproved = async (runnerId, { orderId, serviceType }) => {
  const isPickup = serviceType === 'pick-up' || serviceType === 'pick_up';
  return sendPushNotification({
    recipientId: runnerId,
    recipientType: 'runner',
    title: isPickup ? 'Item Approved!' : 'Items Approved!',
    body: isPickup
      ? 'The pickup item was approved. Proceed with collection.'
      : 'Your item submission was approved. Item budget has been released to your wallet.',
    data: { type: 'item_approved', orderId },
  });
};

const notifyItemRejected = async (runnerId, { orderId, reason }) => {
  return sendPushNotification({
    recipientId: runnerId,
    recipientType: 'runner',
    title: '❌ Items Rejected',
    body: `Your item submission was rejected. Reason: ${reason}`,
    data: { type: 'item_rejected', orderId },
  });
};

const notifyDeliveryConfirmationRequest = async (userId, { orderId }) => {
  return sendPushNotification({
    recipientId: userId,
    recipientType: 'user',
    title: 'Delivery Complete!',
    body: 'Your runner has marked delivery as complete. Please confirm delivery.',
    data: { type: 'delivery_confirmation_request', orderId },
  });
};

const notifyAutoConfirmWarning = async (userId, { orderId }) => {
  return sendPushNotification({
    recipientId: userId,
    recipientType: 'user',
    title: 'Delivery Warning!',
    body: 'Your delivery will be auto marked in 10 minutes, mark as delivered now.',
    data: { type: 'delivery_confirmation_request', orderId },
  });
};

const notifyDeliveryConfirmed = async (runnerId, { orderId, amount }) => {
  return sendPushNotification({
    recipientId: runnerId,
    recipientType: 'runner',
    title: 'Order Earnings!',
    body: `Delivery confirmed! ₦${amount?.toLocaleString()} has been credited to your wallet.`,
    data: { type: 'delivery_confirmed', orderId },
  });
};

const notifyOrderCancelled = async (userId, { orderId, cancelledBy, runnerName, reason }) => {
  return sendPushNotification({
    recipientId: userId,
    recipientType: 'user',
    title: '❌ Order Cancelled',
    body: reason
      ? `${runnerName} cancelled your order. Reason: ${reason}`
      : `${runnerName} cancelled your order.`,
    data: { type: 'order_cancelled', orderId, cancelledBy },
  });
};

const notifyPartnerOffline = async (partnerId, partnerType, { chatId, name }) => {
  return sendPushNotification({
    recipientId: partnerId,
    recipientType: partnerType,
    title: partnerType === 'user' ? 'Runner Offline' : 'User Offline',
    body: `${name} has gone offline.`,
    data: { type: 'partner_offline', chatId },
  });
};

const notifyDisputeRaised = async ({ userId, runnerId, orderId, raisedBy }) => {
  const notifyId = raisedBy === 'user' ? runnerId : userId;
  const notifyType = raisedBy === 'user' ? 'runner' : 'user';
  return sendPushNotification({
    recipientId: notifyId,
    recipientType: notifyType,
    title: '⚠️ Dispute Raised',
    body: 'A dispute has been raised for your order. Our team is reviewing it.',
    data: { type: 'dispute_raised', orderId },
  });
};

const notifyDisputeResolved = async ({ userId, runnerId, orderId, outcome }) => {
  const outcomeText = {
    full_release: 'Payment released to runner',
    full_refund: 'Full refund issued',
    partial_release: 'Partial payment released',
    partial_refund: 'Partial refund issued',
  }[outcome] || 'Dispute resolved';

  await sendPushNotification({
    recipientId: userId,
    recipientType: 'user',
    title: '✅ Dispute Resolved',
    body: `Your dispute has been resolved. ${outcomeText}.`,
    data: { type: 'dispute_resolved', orderId, outcome },
  });

  await sendPushNotification({
    recipientId: runnerId,
    recipientType: 'runner',
    title: '✅ Dispute Resolved',
    body: `Your dispute has been resolved. ${outcomeText}.`,
    data: { type: 'dispute_resolved', orderId, outcome },
  });
};

const notifyRatingPrompt = async (userId, { orderId, runnerName }) => {
  return sendPushNotification({
    recipientId: userId,
    recipientType: 'user',
    title: '⭐ Rate Your Experience',
    body: `How was your delivery with ${runnerName}? Tap to leave a rating.`,
    data: { type: 'rating_prompt', orderId },
  });
};

const notifyEscrowReleased = async (runnerId, { orderId, amount }) => {
  return sendPushNotification({
    recipientId: runnerId,
    recipientType: 'runner',
    title: 'Funds Released',
    body: `₦${amount?.toLocaleString()} has been released to your wallet.`,
    data: { type: 'escrow_released', orderId },
  });
};

const notifyIncomingCall = async (receiverId, receiverType, { callId, chatId, callType, callerId, callerType, channelName, token, callerName }) => {
  return sendPushNotification({
    recipientId: receiverId,
    recipientType: receiverType,
    title: `Incoming ${callType} call`,
    body: `${callerName} is calling you`,
    data: { type: 'incoming_call', callId, chatId, callType, callerId, callerType, channelName, token },
  });
};


module.exports = {
  sendPushNotification,
  notifyPaymentRequest,
  notifyPaymentSuccess,
  notifyItemApprovalRequest,
  notifyItemApproved,
  notifyItemRejected,
  notifyAutoConfirmWarning,
  notifyDeliveryConfirmationRequest,
  notifyDeliveryConfirmed,
  notifyDisputeRaised,
  notifyDisputeResolved,
  notifyRatingPrompt,
  notifyEscrowReleased,
  notifyIncomingCall,
  notifyOrderCancelled,
  notifyPartnerOffline,
};