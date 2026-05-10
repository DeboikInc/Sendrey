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


const ACK_TIMEOUT_MS = 8_000;

/**
 * Emit a status update with ACK tracking + automatic re-queue on failure.
 * Uses the same localStorage queue and flushSocketQueue as everything else.
 *
 * Call this only for 'updateStatus' events from OrderStatusFlow.
 */
export const emitStatusWithAck = (socket, payload) => {
  if (!socket?.connected) {
    enqueueSocketEvent('updateStatus', payload);
    console.log('[socketQueue] offline — status queued:', payload.status);
    return;
  }

  // Enqueue first so the ACK-timeout safety net can find and remove it
  enqueueSocketEvent('updateStatus', payload);

  socket.emit('updateStatus', payload, (ack) => {
    if (ack?.received) {
      // Server confirmed — remove from queue so flushSocketQueue won't replay it
      _removeFromQueue('updateStatus', payload);
      console.log('[socketQueue] status ACKed by server:', payload.status);
    }
    // No else — if ack is missing or ack.received is false, the item stays
    // in the queue and flushSocketQueue will retry it on next reconnect
  });

  // Safety net: if the ACK callback never fires (network drop mid-emit),
  // the item is already in the queue — nothing extra needed
  setTimeout(() => {
    const q = getQueue();
    const still = q.some(
      i => i.event === 'updateStatus' &&
           i.data?.chatId === payload.chatId &&
           i.data?.status === payload.status
    );
    if (still) {
      console.warn('[socketQueue] ACK timeout — status will retry on reconnect:', payload.status);
    }
  }, ACK_TIMEOUT_MS);
};

// Internal helper — removes a specific item from the queue after ACK
const _removeFromQueue = (event, payload) => {
  const q = getQueue().filter(
    i => !(
      i.event === event &&
      i.data?.chatId === payload.chatId &&
      i.data?.status === payload.status
    )
  );
  saveQueue(q);
};