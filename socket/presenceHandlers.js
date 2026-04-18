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

// ── Heartbeat timers: userId → { timer, io, userId, userType, chatId }
const presenceTimers = new Map();

const markOffline = (io, userId, userType, chatId) => {
  presenceTimers.delete(userId);

  getRedis().del(`presence:${userType}:${userId}`).catch(() => {});

  if (!chatId) return;
  const { userId: chatUserId, runnerId: chatRunnerId } = parseChat(chatId);
  if (!chatUserId || !chatRunnerId) return;

  const isRunner = userType === 'runner';
  const partnerType = isRunner ? 'user' : 'runner';
  const partnerId = isRunner ? chatUserId : chatRunnerId;

  io.to(`${partnerType}-${partnerId}`).emit('partnerOffline', {
    chatId, userId, userType, timestamp: new Date().toISOString(),
  });

  // Also send system message to chat room
  const offlineMsg = {
    id: `offline-${userId}-${Date.now()}`,
    from: 'system',
    type: 'system',
    messageType: 'system',
    text: `${isRunner ? 'Runner' : 'User'} went offline`,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    senderId: 'system',
    senderType: 'system',
    status: 'sent',
    createdAt: new Date(),
    isPresenceMessage: true,
  };
  io.to(chatId).emit('message', offlineMsg);
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
    await getRedis().set(`presence:${userType}:${userId}`, chatId || 'online', 'EX', 30);
  } catch (e) {
    console.error('Redis presence set failed:', e);
  }

  // Tell partner they're online
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

const handlePresenceHeartbeat = (socket, io) => {
  const { userId, userType, chatId } = socket;
  if (!userId || !userType) return;

  // Refresh Redis TTL
  getRedis().set(`presence:${userType}:${userId}`, chatId || 'online', 'EX', 30).catch(() => {});

  // Was previously timed out (marked offline) → tell partner they're back
  if (!presenceTimers.has(userId) && chatId) {
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

  // Reset the 10s offline timer
  if (presenceTimers.has(userId)) {
    clearTimeout(presenceTimers.get(userId).timer);
  }

  const timer = setTimeout(() => {
    markOffline(io, userId, userType, chatId);
  }, 10000);

  presenceTimers.set(userId, { timer, io, userId, userType, chatId });
};

const handleUserDisconnect = async (socket, io) => {
  const { userId, userType, chatId } = socket;
  if (!userId || !userType) return;

  // Cancel heartbeat timer immediately
  if (presenceTimers.has(userId)) {
    clearTimeout(presenceTimers.get(userId).timer);
    presenceTimers.delete(userId);
  }

  getRedis().del(`presence:${userType}:${userId}`).catch(() => {});

  // Emit offline instantly — don't wait for anything
  if (chatId) {
    const { userId: chatUserId, runnerId: chatRunnerId } = parseChat(chatId);
    if (chatUserId && chatRunnerId) {
      const isRunner = userType === 'runner';
      const partnerType = isRunner ? 'user' : 'runner';
      const partnerId = isRunner ? chatUserId : chatRunnerId;

      io.to(`${partnerType}-${partnerId}`).emit('partnerOffline', {
        chatId, userId, userType, timestamp: new Date().toISOString(),
      });

      const offlineMsg = {
        id: `offline-${userId}-${Date.now()}`,
        from: 'system', type: 'system', messageType: 'system',
        text: `${isRunner ? 'Runner' : 'User'} went offline`,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        senderId: 'system', senderType: 'system', status: 'sent',
        createdAt: new Date(), isPresenceMessage: true,
      };
      io.to(chatId).emit('message', offlineMsg);
    }
  }

  // Push notifications — fully non-blocking
  if (chatId) setImmediate(() => _sendOfflinePush(socket).catch(() => {}));
};

const _sendOfflinePush = async (socket) => {
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
          });
        }
      }
    }
  } catch (err) {
    console.error('Offline push failed:', err.message);
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
  socket.on('presenceHeartbeat', () => handlePresenceHeartbeat(socket, io)); // ← no safeHandler wrapper, keep it fast
  socket.on('pong', () => handlePresenceHeartbeat(socket, io)); // existing pong also refreshes
};

module.exports = {
  registerPresenceHandlers,
  handleUserDisconnect,
};