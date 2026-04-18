// socket/presenceHandlers.js
const redis = require('../config/redis');
const User = require('../models/User');
const Runner = require('../models/Runner');
const { sendPushNotification } = require('../utils/sendPushNotification');

const getRedis = () => redis.getClient();

const parseChat = (chatId) => {
  const parts = chatId?.split('-runner-');
  const userId = parts?.[0]?.replace('user-', '');
  const runnerId = parts?.[1];
  return { userId, runnerId };
};

const handleUserOnline = async (socket, io, { userId, userType, chatId }) => {
  if (!userId || !userType) return;

  socket.userId = userId;
  socket.userType = userType;
  socket.chatId = chatId || null;
  if (userType === 'runner') socket.runnerId = userId;

  const personalRoom = userType === 'runner' ? `runner-${userId}` : `user-${userId}`;
  socket.join(personalRoom);

  try {
    await getRedis().set(`presence:${userType}:${userId}`, chatId || 'online', 'EX', 300);
  } catch (e) {
    console.error('Redis presence set failed:', e);
  }

  if (chatId) {
    const { userId: chatUserId, runnerId: chatRunnerId } = parseChat(chatId);
    if (chatUserId && chatRunnerId) {
      const isRunner = userType === 'runner';
      const partnerType = isRunner ? 'user' : 'runner';
      const partnerId = isRunner ? chatUserId : chatRunnerId;

      io.to(`${partnerType}-${partnerId}`).emit('partnerOnline', {
        chatId, userId, userType, timestamp: new Date().toISOString(),
      });
    }
  }
};

const handleUserDisconnect = async (socket, io) => {
  const { userId, userType, chatId } = socket;
  if (!userId || !userType) return;

  try {
    await getRedis().del(`presence:${userType}:${userId}`);
  } catch (e) {
    console.error('Redis presence delete failed:', e);
  }

  // Notify partner immediately if in a chat
  if (chatId) {
    const { userId: chatUserId, runnerId: chatRunnerId } = parseChat(chatId);
    if (chatUserId && chatRunnerId) {
      const isRunner = userType === 'runner';
      const partnerType = isRunner ? 'user' : 'runner';
      const partnerId = isRunner ? chatUserId : chatRunnerId;

      io.to(`${partnerType}-${partnerId}`).emit('partnerOffline', {
        chatId, userId, userType, timestamp: new Date().toISOString(),
      });
    }
  }

  // Push notifications only — no DB writes
  if (!chatId) return;

  try {
    if (userType === 'user') {
      const user = await User.findById(userId).select('firstName lastName fcmToken currentRunnerId').lean();
      if (user?.currentRunnerId) {
        const runner = await Runner.findById(user.currentRunnerId).select('fcmToken').lean();
        if (runner?.fcmToken) {
          await sendPushNotification(runner.fcmToken, {
            title: 'User Offline Alert',
            body: `${user.firstName} ${user.lastName || ''} has gone offline`,
            data: { type: 'user_offline', userId: userId.toString(), chatId },
            link: `/runner/chat/${chatId}`,
          });
        }
      }
    } else if (userType === 'runner') {
      const runner = await Runner.findById(userId).select('firstName lastName fcmToken currentUserId').lean();
      if (runner?.currentUserId) {
        const user = await User.findById(runner.currentUserId).select('fcmToken').lean();
        if (user?.fcmToken) {
          await sendPushNotification(user.fcmToken, {
            title: 'Runner Offline Alert',
            body: `Your runner ${runner.firstName} ${runner.lastName || ''} has gone offline`,
            data: { type: 'runner_offline', runnerId: userId.toString(), chatId },
            link: `/chat/${chatId}`,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error sending offline push notification:', error);
  }
};

const handleQueryPresence = async (socket, { chatId, userId, userType }) => {
  try {
    const { userId: chatUserId, runnerId: chatRunnerId } = parseChat(chatId);
    const isRunner = userType === 'runner';
    const partnerType = isRunner ? 'user' : 'runner';
    const partnerId = isRunner ? chatUserId : chatRunnerId;

    const partnerPresence = await getRedis().get(`presence:${partnerType}:${partnerId}`);

    socket.emit('partnerPresenceStatus', {
      chatId,
      isOnline: !!partnerPresence,
      partnerType,
      partnerId,
    });
  } catch (e) {
    console.error('queryPresence error:', e);
  }
};

const handleHeartbeat = async (socket) => {
  if (!socket.userId || !socket.userType) return;
  try {
    await getRedis().expire(`presence:${socket.userType}:${socket.userId}`, 300);
  } catch (e) { /* silent */ }
};

const registerPresenceHandlers = (socket, io, safeHandler) => {
  socket.on('userOnline', (data) => safeHandler(handleUserOnline, socket, io, data));
  socket.on('queryPresence', (data) => safeHandler(handleQueryPresence, socket, data));
  socket.on('pong', () => safeHandler(handleHeartbeat, socket));
};

module.exports = {
  registerPresenceHandlers,
  handleUserDisconnect,
};