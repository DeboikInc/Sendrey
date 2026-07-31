const redisClient = require('../config/redis');

const TTL_SECONDS = 5 * 60; // 5 min backstop; real invalidation happens on write
const cacheKey = (userId) => `order-history:${userId}:first-page`;

const isCacheable = ({ status, taskType, search, dateFrom, dateTo, cursor }) =>
  !status && !taskType && !search && !dateFrom && !dateTo && !cursor;

async function get(userId) {
  try {
    const client = redisClient.getClient();
    const raw = await client.get(cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    // Redis down / not connected — fail open, treat as cache miss
    return null;
  }
}

async function set(userId, result) {
  try {
    const client = redisClient.getClient();
    await client.set(cacheKey(userId), JSON.stringify(result), 'EX', TTL_SECONDS);
  } catch (err) {
  }
}

async function invalidate(userId) {
  try {
    const client = redisClient.getClient();
    await client.del(cacheKey(userId));
  } catch (err) {
  }
}

module.exports = { isCacheable, get, set, invalidate };