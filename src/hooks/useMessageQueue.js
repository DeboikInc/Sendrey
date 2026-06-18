import { useEffect, useRef, useCallback } from 'react';

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 2000;
const ACK_TIMEOUT_MS = 5000;

export const useMessageQueue = ({
  socket,
  isConnected,
  chatId,
  sendMessage,
  onStatusUpdate,
  enabled = false,
}) => {
  const queueRef = useRef([]);
  const isFlushing = useRef(false);

  const flushQueue = useCallback(async () => {
    if (!enabled || isFlushing.current || !socket?.connected || !queueRef.current.length) return;

    isFlushing.current = true;
    const pending = [...queueRef.current];

    for (const item of pending) {
      if (!socket?.connected) break; // socket dropped mid-flush — leave rest in queue

      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('ack timeout')), ACK_TIMEOUT_MS);

          const onEcho = (echo) => {
            const matched =
              echo?.id === item.msg.id ||
              echo?.tempId === item.msg.id ||
              echo?.id === item.msg.tempId;
            if (!matched) return;
            clearTimeout(timeout);
            socket.off('messageEcho', onEcho);
            resolve();
          };

          socket.on('messageEcho', onEcho);
          sendMessage(item.chatId, item.msg);

          // safety cleanup if resolve never fires
          setTimeout(() => socket.off('messageEcho', onEcho), ACK_TIMEOUT_MS + 500);
        });

        // echo confirmed — remove from queue and mark delivered
        queueRef.current = queueRef.current.filter((q) => q.msg.id !== item.msg.id);
        onStatusUpdate?.(item.msg.id, 'delivered');
      } catch {
        const idx = queueRef.current.findIndex((q) => q.msg.id === item.msg.id);
        if (idx === -1) continue;

        queueRef.current[idx].retries = (queueRef.current[idx].retries || 0) + 1;

        if (queueRef.current[idx].retries >= MAX_RETRIES) {
          onStatusUpdate?.(item.msg.id, 'failed');
          queueRef.current.splice(idx, 1);
        }
      }
    }

    isFlushing.current = false;
  }, [enabled, socket, sendMessage, onStatusUpdate]);

  // Primary flush trigger — socket 'connect' fires at exactly the right moment
  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => setTimeout(() => flushQueue(), 500);
    socket.on('connect', handleConnect);
    return () => socket.off('connect', handleConnect);
  }, [socket, flushQueue]);

  // Secondary flush trigger — catches initial mount when already connected
  useEffect(() => {
    if (isConnected && queueRef.current.length > 0) flushQueue();
  }, [isConnected, flushQueue]);

  // Retry loop — catches any edge case where connect event was missed
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      if (queueRef.current.length > 0 && socket?.connected && !isFlushing.current) {
        flushQueue();
      }
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, socket, flushQueue]);

  // Echo handler for non-queued messages (normal connected sends)
  useEffect(() => {
    if (!socket) return;
    const handleEcho = (echo) => {
      if (!echo?.id && !echo?.tempId) return;
      if (echo.tempId) {
        onStatusUpdate?.(echo.tempId, 'delivered', echo.id);
      } else {
        onStatusUpdate?.(echo.id, 'delivered');
      }
    };
    socket.on('messageEcho', handleEcho);
    return () => socket.off('messageEcho', handleEcho);
  }, [socket, onStatusUpdate]);

  const enqueue = useCallback(
    (msg) => {
      if (!enabled) return;
      const alreadyQueued = queueRef.current.some((q) => q.msg.id === msg.id);
      if (alreadyQueued) return;
      queueRef.current.push({ chatId, msg, retries: 0 });
      onStatusUpdate?.(msg.id, 'queued');
    },
    [chatId, enabled, onStatusUpdate]
  );

  return { enqueue, flushQueue };
};