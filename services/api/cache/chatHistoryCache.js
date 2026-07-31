const redisClient = require('../config/redis');
const cacheKey = (chatId) => `chat-history:${chatId}`;

async function get(chatId) {
  try {
    const client = redisClient.getClient();
    const raw = await client.get(cacheKey(chatId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null; // fail open
  }
}

async function saveChatHistory(chatId, messages) {
  try {
    const client = redisClient.getClient();
    await client.set(cacheKey(chatId), JSON.stringify(messages));
  } catch (err) { /* best-effort */ }
}

async function invalidate(chatId) {
  try {
    const client = redisClient.getClient();
    await client.del(cacheKey(chatId));
  } catch (err) { }
}

module.exports = { get, saveChatHistory, invalidate };