  const redisClient = require('../config/redis');

  const TTL_SECONDS = 60; // short — list changes on every message, cache just absorbs read bursts
  const cacheKey = (runnerId) => `recent-chats:${runnerId}`;

  async function get(runnerId) {
    try {
      const client = redisClient.getClient();
      const raw = await client.get(cacheKey(runnerId));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      // cache miss
      return null;
    }
  }

  async function set(runnerId, chats) {
    try {
      const client = redisClient.getClient();
      await client.set(cacheKey(runnerId), JSON.stringify(chats), 'EX', TTL_SECONDS);
    } catch (err) {
      
    }
  }

  async function invalidate(runnerId) {
    try {
      const client = redisClient.getClient();
      await client.del(cacheKey(runnerId));
    } catch (err) {
      // if this fails, TTL is the backstop
    }
  }

  module.exports = { get, set, invalidate };