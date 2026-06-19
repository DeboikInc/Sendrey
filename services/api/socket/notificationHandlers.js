const { sendPushNotification } = require('../utils/sendPushNotification');
const User = require('../models/User');
const Runner = require('../models/Runner');
const { logSocketAudit } = require('../utils/socketAudit');

/**
 * Save FCM token for new message
 */
const handleSaveFcmToken = async (socket, { userId, userType, fcmToken }) => {
  if (!userId || !fcmToken) {
    console.warn('[saveFcmToken] missing userId or fcmToken');
    return;
  }

  console.log('[saveFcmToken] saving for:', userType, userId);

  try {
    const Model = userType === 'runner' ? Runner : User;
    await Model.findByIdAndUpdate(userId, { fcmToken });
    console.log('[saveFcmToken] ✅ saved');
  } catch (err) {
    console.error('[saveFcmToken] ❌ failed:', err.message);
  }
};

/**
 * Send push notification for new message
 * Only if recipient is offline or not viewing the chat
 */
const sendMessageNotification = async (chatId, message, senderId, senderType) => {
  try {
    if (!chatId || !senderId || !senderType || senderId === 'system') {
      console.warn('sendMessageNotification: missing required fields, skipping');
      return;
    }

    // Extract userId and runnerId from chatId
    const parts = chatId.split('-runner-');
    const userId = parts[0]?.replace('user-', '');
    const runnerId = parts[1];

    if (!userId || !runnerId || userId === 'undefined' || runnerId === 'undefined') {
      console.warn('Bad chatId, skipping notification:', chatId);
      return;
    }

    let recipient;
    let recipientType;
    let senderName;

    // Determine recipient
    if (senderType === 'user') {
      recipient = await Runner.findById(runnerId);
      recipientType = 'runner';
      const sender = await User.findById(senderId);
      senderName = `${sender?.firstName || 'User'} ${sender?.lastName || ''}`;
    } else {
      recipient = await User.findById(userId);
      recipientType = 'user';
      const sender = await Runner.findById(senderId);
      senderName = `${sender?.firstName || 'Runner'} ${sender?.lastName || ''}`;
    }

    // Send push notification only if recipient is offline
    if (recipient && !recipient.isOnline && recipient.fcmToken) {
      const messagePreview = message.text
        ? (message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text)
        : message.type === 'image' ? '📷 Photo'
          : message.type === 'video' ? '🎥 Video'
            : message.type === 'audio' ? '🎵 Audio'
              : '📎 File';

      await sendPushNotification(recipient.fcmToken, {
        title: senderName,
        body: messagePreview,
        data: {
          type: 'message',
          chatId,
          messageId: message.id,
          senderId,
          senderType,
        },
        link: `/${recipientType}/chat/${chatId}`,
      });

      // console.log(`Message notification sent to ${recipientType} ${recipient._id}`);
    }
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};

/**
 * Send push notification for status update
 * Only if recipient is offline
 */
const sendStatusUpdateNotification = async (chatId, status, updatedBy, updatedByType) => {
  try {
    const parts = chatId.split('-runner-');
    const userId = parts[0]?.replace('user-', '');
    const runnerId = parts[1];

    // Status updates are sent to users only
    const user = await User.findById(userId);

    if (user && !user.isOnline && user.fcmToken) {
      const statusMessages = {
        // Order lifecycle
        'pending_payment': '💳 Payment required for your order',
        'paid': '✅ Payment confirmed',

        // Errand statuses (from stageMap / STATUS MAPPER)
        'arrived_at_market': '🛒 Runner has arrived at the market',
        'purchase_in_progress': '🛍️ Runner is purchasing your items',
        'purchase_completed': '✅ Purchase completed',
        'en_route_to_delivery': '🚚 Runner is on the way to you',
        'arrived_at_delivery_location': '📍 Runner has arrived at your location',
        'item_delivered': '📦 Your items have been delivered',
        'task_completed': '🎉 Task completed successfully',

        // Pickup statuses
        'arrived_at_pickup_location': '📍 Runner has arrived at pickup location',
        'item_collected': '✅ Items have been collected',

        // Cancellation
        'cancelled': '❌ Order has been cancelled',
      };

      const message = statusMessages[status] || `Status updated to: ${status}`;

      await sendPushNotification(user.fcmToken, {
        title: 'Order Update',
        body: message,
        data: {
          type: 'status_update',
          chatId,
          status,
          updatedBy,
          updatedByType,
        },
        link: `/user/chat/${chatId}`,
      });

      // console.log(`Status update notification sent to user ${user._id}`);
    }
  } catch (error) {
    console.error('❌ Error sending status update notification:', error);
  }
};

module.exports = {
  sendMessageNotification,
  sendStatusUpdateNotification,
  handleSaveFcmToken
};