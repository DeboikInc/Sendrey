// config/redis.js
const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
  tls: undefined,
  retryStrategy: (times) => {
    // Exponential backoff
    const delay = Math.min(times * 200, 10000);
    console.warn(`[Redis] reconnect attempt ${times}, retrying in ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

const INITIAL_CONNECT_TIMEOUT_MS = 20000;

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }


  async connect() {
    if (this.client) return this.client;
    if (this._connecting) return this._connecting;

    this._connecting = (async () => {

      try {
        this.client = new Redis(redisConfig);
        this.subscriber = new Redis(redisConfig);
        this.publisher = new Redis(redisConfig);

        // Handle connection events
        this.client.on('connect', () => {
          console.log('✅ Redis connected');
          this.isConnected = true;
        });

        this.client.on('error', (err) => {
          console.error('❌ Redis error (retrying in background):', err.message);
          this.isConnected = false;
        });

        this.client.on('reconnecting', (delay) => {
          console.warn(`⚠️ Redis reconnecting in ${delay}ms`);
        });

        this.client.on('close', () => {
          console.warn('⚠️ Redis connection closed');
          this.isConnected = false;
        });

        this.subscriber.on('error', (err) => {
          console.error('❌ Redis subscriber error:', err.message);
        });

        this.publisher.on('error', (err) => {
          console.error('❌ Redis publisher error:', err.message);
        });

        // Wait for ready state
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Redis did not become ready within ${INITIAL_CONNECT_TIMEOUT_MS}ms (still retrying in background)`));
          }, INITIAL_CONNECT_TIMEOUT_MS);

          this.client.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        // console.log("redis connected")
        return this.client;
      } catch (error) {
        throw error;
      } finally {
        this._connecting = null; 
      }
    }
    )();
    return this._connecting;
  }

  getClient() {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  getSubscriber() {
    if (!this.subscriber) {
      throw new Error('Redis subscriber not connected. Call connect() first.');
    }
    return this.subscriber;
  }

  getPublisher() {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.publisher;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }
    this.isConnected = false;
    console.warn('Redis disconnected');
  }
}

module.exports = new RedisClient();