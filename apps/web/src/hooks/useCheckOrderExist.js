import { useEffect, useState } from 'react';

export function useCheckOrderExist({ chatId, hasOrder, socket, enabled }) {
  const [orderMissing, setOrderMissing] = useState(false);
  const [checking, setChecking] = useState(false);

  // hasOrder flipping true is the one true "success" signal — always wins
  useEffect(() => {
    if (hasOrder) {
      setChecking(false);
      setOrderMissing(false);
    }
  }, [hasOrder]);

  useEffect(() => {
    if (!enabled || !chatId || hasOrder) {
      setChecking(false);
      return;
    }
    setChecking(true);
    setOrderMissing(false);
  }, [chatId, hasOrder, enabled]);

  useEffect(() => {
    if (!socket || !enabled) return;

    const onOrderCreated = (payload) => {
      if (payload?.order?.chatId && payload.order.chatId !== chatId) return;
      setChecking(false);
      setOrderMissing(false);
    };

    const onSessionAborted = ({ chatId: inc }) => {
      if (inc !== chatId) return;
      setChecking(false);
      setOrderMissing(true);
    };

    const onChatError = ({ chatId: inc, code }) => {
      if (inc !== chatId) return;
      if (['ORDER_CREATE_FAILED', 'NO_ACTIVE_REQUEST', 'REQUEST_MISMATCH', 'CHAT_INIT_FAILED'].includes(code)) {
        setChecking(false);
        setOrderMissing(true);
      }
    };

    socket.on('orderCreated', onOrderCreated);
    socket.on('sessionAborted', onSessionAborted);
    socket.on('chatError', onChatError);
    return () => {
      socket.off('orderCreated', onOrderCreated);
      socket.off('sessionAborted', onSessionAborted);
      socket.off('chatError', onChatError);
    };
  }, [socket, chatId, enabled]);

  const dismiss = () => {
    setOrderMissing(false);
    setChecking(false);
  };

  return { orderMissing, checking, dismiss };
}