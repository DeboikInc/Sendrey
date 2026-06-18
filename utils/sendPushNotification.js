const admin = require('../config/firebaseAdmin');

const sendPushNotification = async (fcmToken, notification) => {
  if (!fcmToken) {
    console.warn(' No FCM token provided');
    return null;
  }

  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: Object.fromEntries(
      Object.entries(notification.data || {})
        .map(([k, v]) => [k, v == null ? '' : String(v)])
    ),
    token: fcmToken,
    webpush: {
      notification: {
        icon: process.env.LOGO_URL,
        badge: process.env.LOGO_URL,
        requireInteraction: true,
      },
      fcmOptions: {
        link: notification.link || '/',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(' Push notification sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);

    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered') {
      // console.log('Invalid FCM token');
      return { error: 'invalid_token' };
    }

    throw error;
  }
};

module.exports = { sendPushNotification };