const QUEUE_KEY = 'sendrey_socket_queue';
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

const getQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
};

export const enqueueSocketEvent = (event, data) => {
  const queue = getQueue();

  // Deduplicate — don't queue the same event+orderId/messageId twice
  const isDuplicate = queue.some(
    (item) =>
      item.event === event &&
      item.data?.orderId === data?.orderId &&
      item.data?.messageId === data?.messageId &&
      item.data?.submissionId === data?.submissionId
  );
  if (isDuplicate) return;

  queue.push({
    id: `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event,
    data,
    timestamp: Date.now(),
    retries: 0,
  });

  saveQueue(queue);
};

export const flushSocketQueue = (socket) => {
  if (!socket?.connected) return;

  const queue = getQueue();
  if (!queue.length) return;

  const failed = [];

  for (const item of queue) {
    // Drop stale items
    if (Date.now() - item.timestamp > MAX_AGE_MS) {
      console.log('[socketQueue] dropping stale event:', item.event);
      continue;
    }

    // Drop items that have exceeded retry limit
    if ((item.retries || 0) >= MAX_RETRIES) {
      console.warn('[socketQueue] dropping after max retries:', item.event, item.data);
      continue;
    }

    try {
      socket.emit(item.event, item.data);
      console.log('[socketQueue] flushed:', item.event);
    } catch {
      failed.push({ ...item, retries: (item.retries || 0) + 1 });
    }
  }

  saveQueue(failed);
};

export const clearSocketQueue = () => localStorage.removeItem(QUEUE_KEY);