const { Chat } = require('../models/Chat');
const chatHistoryCache = require('../cache/chatHistoryCache');
const recentChatsCache = require('../cache/recentChatsCache');
const User = require('../models/User');
const RECENT_CHATS_LIMIT = 30;
const BOT_CHAT_PREFIX = 'bot-';

class ChatService {
  async getRecentChats(runnerId) {
    const cached = await recentChatsCache.get(runnerId);
    if (cached) {
      const clean = cached.filter(c => !c.chatId?.startsWith(BOT_CHAT_PREFIX));
      if (clean.length !== cached.length) {
        await recentChatsCache.set(runnerId, clean);
      }

      return clean;
    }

    const chats = await Chat.find({ runnerId })
      .sort({ lastActivity: -1 })
      .limit(RECENT_CHATS_LIMIT)
      .select('chatId userId orderId messages lastActivity')
      .lean();


    const userIds = chats.map(c => c.userId).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
      .sort({ lastActivity: -1 })
      .limit(RECENT_CHATS_LIMIT)
      .select('_id firstName lastName messages lastActivity')
      .lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User';
    });

    const shaped = chats.map((chat) => {
      const shapedChat = this._shapeChat(chat);
      if (chat.userId && userMap[chat.userId.toString()]) {
        shapedChat.name = userMap[chat.userId.toString()];
        shapedChat.userName = userMap[chat.userId.toString()];
      }
      return shapedChat;
    });

    await recentChatsCache.set(runnerId, shaped);
    return shaped;
  }

  async getBotChatHistory(runnerId) {
    if (!runnerId) return [];
    const chatId = `${BOT_CHAT_PREFIX}${runnerId}`;
    return this.getChatHistory(chatId); // reuses existing cache-then-Mongo logic
  }

  async saveBotChatHistory(runnerId, messages) {
    if (!runnerId || !Array.isArray(messages)) return;
    const chatId = `${BOT_CHAT_PREFIX}${runnerId}`;

    await Chat.findOneAndUpdate(
      { chatId },
      {
        $set: {
          chatId,
          runnerId,
          messages,
          isBotChat: true,
          lastActivity: new Date(),
        },
      },
      { upsert: true }
    );

    await Chat.updateMany(
      { chatId: { $not: /^bot-/ }, isBotChat: true },
      { $set: { isBotChat: false } }
    );

    await chatHistoryCache.saveChatHistory(chatId, messages);
  }

  // update recent chats when a new chat is created
  async updateRecentChats(runnerId, chatData) {
    if (!runnerId || !chatData) {
      console.log('[updateRecentChats] missing runnerId or chatData');
      return;
    }

    if (chatData.isBotChat || chatData.chatId?.startsWith(BOT_CHAT_PREFIX)) {
      console.log('[updateRecentChats] skipped — bot chat', chatData.chatId);
      return;
    }

    // Get current recent chats from cache
    const current = await recentChatsCache.get(runnerId) || [];
    const exists = current.some(c => c.chatId === chatData.chatId);

    // If it exists, just update the lastMessage and time, don't add duplicate
    if (exists) {
      const lastRealMsg = [...(chatData.messages || [])]
        .reverse()
        .find(m => m.from !== 'system' && m.type !== 'system' && m.messageType !== 'system');

      const updated = current.map(c => {
        if (c.chatId === chatData.chatId) {
          return {
            ...c,
            lastMessage: lastRealMsg?.text?.substring(0, 30) || c.lastMessage || '',
            time: lastRealMsg?.time || chatData.lastActivity || c.time || '',
            lastActivity: chatData.lastActivity || new Date(),
          };
        }
        return c;
      });

      // Sort by lastActivity
      updated.sort((a, b) => {
        const timeA = a.lastActivity || a.time || '';
        const timeB = b.lastActivity || b.time || '';
        return timeB.localeCompare(timeA);
      });

      await recentChatsCache.set(runnerId, updated);
      console.log('[updateRecentChats] updated existing cache, count:', updated.length);
      return;
    }

    const shaped = this._shapeChat(chatData);
    const filtered = current.filter(c => c.chatId !== chatData.chatId);

    filtered.unshift(shaped);

    // Keep only limit
    if (filtered.length > RECENT_CHATS_LIMIT) {
      filtered.length = RECENT_CHATS_LIMIT;
    }

    // Save to cache
    await recentChatsCache.set(runnerId, filtered);
    console.log('[updateRecentChats] updated cache, count:', filtered.length);
  }

  async invalidateForRunner(runnerId) {
    await recentChatsCache.invalidate(runnerId);
  }

  _shapeChat(chat) {
    const lastRealMsg = [...(chat.messages || [])]
      .reverse()
      .find(m => m.from !== 'system' && m.type !== 'system' && m.messageType !== 'system');

    return {
      id: chat.userId || chat.chatId,
      userId: chat.userId,
      chatId: chat.chatId,
      orderId: chat.orderId || null,
      lastMessage: lastRealMsg?.text?.substring(0, 30) || chat.lastMessage || '',
      time: lastRealMsg?.time || chat.lastActivity || '',
      lastActivity: chat.lastActivity || new Date(),
      name: chat.userName || 'User',
      online: false,
      unread: 0,
    };
  }

  async getChatHistory(chatId) {
    const cached = await chatHistoryCache.get(chatId);
    if (cached) {
      console.log("cache found ", cached);
      return cached;
    }

    const chat = await Chat.findOne({ chatId }).select('messages').lean();
    const messages = chat?.messages || [];

    await chatHistoryCache.saveChatHistory(chatId, messages);
    return messages;
  }

  async saveChatHistory(chatId, messages) {
    await chatHistoryCache.saveChatHistory(chatId, messages);
  }

  async invalidateChatHistory(chatId) {
    await chatHistoryCache.invalidate(chatId);
  }
}

module.exports = new ChatService();