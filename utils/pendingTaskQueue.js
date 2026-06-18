const MAX_ATTEMPTS = 10;
const RETRY_DELAYS = [5000, 10000, 15000, 30000, 60000];

const queue = new Map(); // key → { handler, args, attempts, lastAttempt }

const enqueue = (key, handler, args) => {
  if (queue.has(key)) return;
  queue.set(key, { handler, args, attempts: 0, lastAttempt: 0 });
  console.log(`[socketQueue] enqueued: ${key}`);
};

const dequeue = (key) => {
  queue.delete(key);
};

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
    console.warn(`[socketQueue] max attempts reached for ${key} — dropping`);
    queue.delete(key);
    return false;
  }
  const delay = RETRY_DELAYS[Math.min(item.attempts, RETRY_DELAYS.length - 1)];
  return Date.now() - item.lastAttempt >= delay;
};

module.exports = { enqueue, dequeue, getAll, markAttempt, shouldRetry };