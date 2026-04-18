// socket/presenceHandlers.js
const redis = require('../config/redis');
const User = require('../models/User');
const Runner = require('../models/Runner');
const { sendPushNotification } = require('../utils/sendPushNotification');

const getRedis = () => redis.getClient();
const presenceTimers = new Map();

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
    await getRedis().set(`presence:${userType}:${userId}`, chatId || 'online', 'EX', 30); // ← was 300, now 30s
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

const markOffline = (io, userId, userType, chatId) => {
  presenceTimers.delete(userId);

  try {
    getRedis().del(`presence:${userType}:${userId}`).catch(() => { });
  } catch (e) { }

  if (!chatId) return;
  const { userId: chatUserId, runnerId: chatRunnerId } = parseChat(chatId);
  if (!chatUserId || !chatRunnerId) return;

  const isRunner = userType === 'runner';
  const partnerType = isRunner ? 'user' : 'runner';
  const partnerId = isRunner ? chatUserId : chatRunnerId;

  io.to(`${partnerType}-${partnerId}`).emit('partnerOffline', {
    chatId, userId, userType, timestamp: new Date().toISOString(),
  });
};

const handleHeartbeat = async (socket, io) => {
  const { userId, userType, chatId } = socket;
  if (!userId || !userType) return;

  // Refresh Redis
  try {
    await getRedis().set(`presence:${userType}:${userId}`, chatId || 'online', 'EX', 30);
  } catch (e) { }

  // If they were previously marked offline, tell partner they're back
  const wasOffline = !presenceTimers.has(userId);

  // Clear existing timer
  if (presenceTimers.has(userId)) {
    clearTimeout(presenceTimers.get(userId));
  }

  // If previously offline → emit online to partner
  if (wasOffline && chatId) {
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

  // Set new 10s timeout — if no heartbeat arrives, mark offline
  const timer = setTimeout(() => {
    markOffline(io, userId, userType, chatId);
  }, 10000); // 10s window — client sends every 5s so 2 missed = offline

  presenceTimers.set(userId, timer);
};

const handleUserDisconnect = async (socket, io) => {
  const { userId, userType, chatId } = socket;
  if (!userId || !userType) return;

  // Cancel heartbeat timer — socket disconnect also clears it
  if (presenceTimers.has(userId)) {
    clearTimeout(presenceTimers.get(userId));
    presenceTimers.delete(userId);
  }

  getRedis().del(`presence:${userType}:${userId}`).catch(() => { });

  // Still emit offline on disconnect for instant feedback
  // (heartbeat timer would catch it in 10s anyway, this is faster for clean disconnects)
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

  // Push notifications — non-blocking
  if (chatId) setImmediate(() => _sendOfflinePushNotification(socket).catch(() => { }));
};

// Extract push logic so disconnect returns fast
const _sendOfflinePushNotification = async (socket) => {
  const { userId, userType, chatId } = socket;
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

const registerPresenceHandlers = (socket, io, safeHandler) => {
  socket.on('userOnline', (data) => safeHandler(handleUserOnline, socket, io, data));
  socket.on('queryPresence', (data) => safeHandler(handleQueryPresence, socket, data));
  socket.on('presenceHeartbeat', () => safeHandler(handleHeartbeat, socket, io));
  socket.on('pong', () => safeHandler(handleHeartbeat, socket));
};

module.exports = {
  registerPresenceHandlers,
  handleUserDisconnect,
};