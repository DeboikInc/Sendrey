const redis = require('../config/redis');
const User = require('../models/User');
const Runner = require('../models/Runner');
const { sendPushNotification } = require('../utils/sendPushNotification');
const Order = require('../models/Order');

const getRedis = () => redis.getClient();
const OFFLINE_TIMEOUT_MS = 7000;
const REDIS_TTL_S = 10;

const parseChat = (chatId) => {
  const parts = chatId?.split('-runner-');
  const userId = parts?.[0]?.replace('user-', '');
  const runnerId = parts?.[1];
  return { userId, runnerId };
};

const isOrderTerminal = async (chatId) => {
  if (!chatId) return false;
  const order = await Order.findOne({ chatId })
    .select('status').lean();
  return ['completed', 'cancelled', 'task_completed'].includes(order?.status);
};

const presenceTimers = new Map();
// Track who was genuinely online before — survives order resets
const confirmedOnline = new Set();

const getPartner = (userType, chatId) => {
  const { userId: chatUserId, runnerId: chatRunnerId } = parseChat(chatId);
  if (!chatUserId || !chatRunnerId) return null;
  const isRunner = userType === 'runner';
  return {
    isRunner,
    partnerType: isRunner ? 'user' : 'runner',
    partnerId: isRunner ? chatUserId : chatRunnerId,
    partnerRoom: isRunner ? `user-${chatUserId}` : `runner-${chatRunnerId}`,
  };
};

const markOffline = (io, userId, userType, chatId) => {
  presenceTimers.delete(userId);
  confirmedOnline.delete(userId); // they're gone
  getRedis().del(`presence:${userType}:${userId}`).catch(() => { });

  if (!chatId) return;
  const partner = getPartner(userType, chatId);
  if (!partner) return;

  const { partnerRoom } = partner;
  const isRunner = userType === 'runner';

  // Status update to partner's personal room
  io.to(partnerRoom).emit('partnerOffline', {
    chatId, userId, userType, timestamp: new Date().toISOString(),
  });

  // System message to partner's personal room (not chatId room)
  io.to(partnerRoom).emit('message', {
    id: `offline-${userId}-${Date.now()}`,
    from: 'system',
    type: 'system',
    messageType: 'system',
    text: isRunner ? 'Runner went offline' : 'User went offline',
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    senderId: 'system',
    senderType: 'system',
    status: 'sent',
    createdAt: new Date(),
    isPresenceMessage: true,
  });
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
    await getRedis().set(`presence:${userType}:${userId}`, chatId || 'online', 'EX', REDIS_TTL_S);
  } catch (e) {
    console.error('Redis presence set failed:', e);
  }

  // Only tell partner if we have a chatId and weren't already marked online
  if (chatId && !confirmedOnline.has(userId)) {
    confirmedOnline.add(userId);
    const partner = getPartner(userType, chatId);
    if (partner) {
      io.to(partner.partnerRoom).emit('partnerOnline', {
        chatId, userId, userType, timestamp: new Date().toISOString(),
      });
    }
  }
};

const handlePresenceHeartbeat = (socket, io) => {
  const { userId, userType, chatId } = socket;
  if (!userId || !userType) return;

  getRedis().set(`presence:${userType}:${userId}`, chatId || 'online', 'EX', REDIS_TTL_S).catch(() => { });

  // wasOffline = timer didn't exist AND they weren't in confirmedOnline set
  // This means they genuinely dropped and came back, not just a new order
  const wasGenuinelyOffline = !presenceTimers.has(userId) && !confirmedOnline.has(userId);

  // Reset the offline timer
  if (presenceTimers.has(userId)) {
    clearTimeout(presenceTimers.get(userId).timer);
  }

  const timer = setTimeout(() => {
    markOffline(io, userId, userType, chatId);
  }, OFFLINE_TIMEOUT_MS);

  presenceTimers.set(userId, { timer, io, userId, userType, chatId });
  confirmedOnline.add(userId);

  // Only emit "back online" if they were genuinely offline before
  if (wasGenuinelyOffline && chatId) {
    const partner = getPartner(userType, chatId);
    if (partner) {
      const isRunner = userType === 'runner';

      io.to(partner.partnerRoom).emit('partnerOnline', {
        chatId, userId, userType, timestamp: new Date().toISOString(),
      });

      io.to(partner.partnerRoom).emit('message', {
        id: `online-${userId}-${Date.now()}`,
        from: 'system',
        type: 'system',
        messageType: 'system',
        text: isRunner ? 'Runner is back online' : 'User is back online',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        senderId: 'system',
        senderType: 'system',
        status: 'sent',
        createdAt: new Date(),
        isPresenceMessage: true,
      });
    }
  }
};

const handleUserDisconnect = async (socket, io) => {
  const { userId, userType, chatId } = socket;
  if (!userId || !userType) return;

  if (presenceTimers.has(userId)) {
    clearTimeout(presenceTimers.get(userId).timer);
    presenceTimers.delete(userId);
  }

  confirmedOnline.delete(userId);
  getRedis().del(`presence:${userType}:${userId}`).catch(() => { });

  if (chatId) {
    const partner = getPartner(userType, chatId);
    if (partner) {
      const isRunner = userType === 'runner';

      io.to(partner.partnerRoom).emit('partnerOffline', {
        chatId, userId, userType, timestamp: new Date().toISOString(),
      });

      // System message on disconnect too
      io.to(partner.partnerRoom).emit('message', {
        id: `offline-${userId}-${Date.now()}`,
        from: 'system',
        type: 'system',
        messageType: 'system',
        text: isRunner ? 'Runner went offline' : 'User went offline',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        senderId: 'system',
        senderType: 'system',
        status: 'sent',
        createdAt: new Date(),
        isPresenceMessage: true,
      });
    }
  }

  if (chatId) setImmediate(() => _sendOfflinePush(socket).catch(() => { }));
};

const _sendOfflinePush = async (socket) => {
  const { userId, userType, chatId } = socket;
  try {
    if (await isOrderTerminal(chatId)) return;
    
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
    } else {
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
    const partner = getPartner(userType, chatId);
    if (!partner) return;

    const partnerPresence = await getRedis().get(`presence:${partner.partnerType}:${partner.partnerId}`);

    socket.emit('partnerPresenceStatus', {
      chatId,
      isOnline: !!partnerPresence,
      partnerType: partner.partnerType,
      partnerId: partner.partnerId,
    });
  } catch (e) {
    console.error('queryPresence error:', e);
  }
};

// Call this when a new order starts so confirmedOnline doesn't incorrectly
// treat the next heartbeat as a "comeback" for a mid-session user
const resetPresenceForChat = (chatId) => {
  const { userId: chatUserId, runnerId: chatRunnerId } = parseChat(chatId);
  // Don't remove from confirmedOnline — they're still connected,
  // just starting a new order. The timer is still running.
  // This is intentionally a no-op: confirmedOnline persists across orders.
};

const registerPresenceHandlers = (socket, io, safeHandler) => {
  socket.on('userOnline', (data) => safeHandler(handleUserOnline, socket, io, data));
  socket.on('queryPresence', (data) => safeHandler(handleQueryPresence, socket, data));
  socket.on('presenceHeartbeat', () => handlePresenceHeartbeat(socket, io));
  socket.on('pong', () => handlePresenceHeartbeat(socket, io));
};

module.exports = {
  registerPresenceHandlers,
  handleUserDisconnect,
  resetPresenceForChat,
};