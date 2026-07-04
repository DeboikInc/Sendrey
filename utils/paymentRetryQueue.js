// utils/paymentRetryQueue.js

const MAX_ATTEMPTS = 10;
const RETRY_DELAYS = [5000, 10000, 15000, 30000, 60000];
const POLL_INTERVAL_MS = 15000;

const queue = new Map(); // key → { handler, args, attempts, lastAttempt }

const enqueue = (key, handler, args) => {
  if (queue.has(key)) return;
  queue.set(key, { handler, args, attempts: 0, lastAttempt: 0 });
  console.log(`[paymentRetryQueue] enqueued: ${key}`);
};

const dequeue = (key) => queue.delete(key);
const getAll = () => [...queue.entries()];

const markAttempt = (key) => {
  const item = queue.get(key);
  if (!item) return;
  item.attempts++;
  item.lastAttempt = Date.now();
};

const shouldRetry = (key) => {
  const item = queue.get(key);
  if (!item) return false;
  if (item.attempts >= MAX_ATTEMPTS) {
    console.warn(`[paymentRetryQueue] max attempts reached for ${key} — dropping`);
    queue.delete(key);
    return false;
  }
  const delay = RETRY_DELAYS[Math.min(item.attempts, RETRY_DELAYS.length - 1)];
  return Date.now() - item.lastAttempt >= delay;
};

// Call once at startup — runs its own drain loop internally.
const startRetryLoop = () => {
  setInterval(async () => {
    for (const [key, item] of getAll()) {
      if (!shouldRetry(key)) continue;
      markAttempt(key);
      try {
        await item.handler(...item.args);
        dequeue(key);
        console.log(`[paymentRetryQueue] success [${key}]`);
      } catch (err) {
        console.error(`[paymentRetryQueue] retry failed [${key}]:`, err.message);
      }
    }
  }, POLL_INTERVAL_MS);
};

module.exports = { enqueue, dequeue, getAll, markAttempt, shouldRetry, startRetryLoop };