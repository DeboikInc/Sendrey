// hooks/useRunnerChatRoomJoin.js
import { useEffect } from 'react';
import { fetchOrderByChatId } from '../Redux/orderSlice';
import { fetchRefreshRecentChats } from '../Redux/runnerSlice';
import { setCachedRecentChats } from '../utils/recentChatsCache';
import useOrderStore from '../store/orderStore';

const BOT_CHAT_ID = 'sendrey-bot';

export function useRunnerChatRoomJoin({
  selectedUser,
  socket,
  runnerId,
  dispatch,
  chatSessionKey,
  chatManager,
  currentOrderRef,
  activeChatIdRef,
  activeSetMessagesRef,
  setChatHistory,
  mergeChatHistory,
  setAwaitingChatReady,
}) {
  useEffect(() => {
    console.log('[raw JOIN EFFECT] selectedUser:', selectedUser?._id,
      'isReconnect:', chatManager.get(`user-${selectedUser?._id}-runner-${runnerId}`)?.messages?.length > 0,
      'socket.connected:', socket?.connected,
    );

    if (!selectedUser || !socket || selectedUser.isBot) return;

    const chatId = `user-${selectedUser._id}-runner-${runnerId}`;
    let joined = false;
    let fallbackTimer;

    const handleChatHistory = async (msgs) => {
      if (activeChatIdRef.current !== chatId) return;
      let latestOrder = null;

      console.log('[AWAIT CLEAR] handleChatHistory');
      setAwaitingChatReady(false);

      try {
        const result = await dispatch(fetchOrderByChatId(chatId)).unwrap();
        if (result) {
          latestOrder = result?.data ?? result;
          const isTerminal = ['cancelled', 'completed', 'task_completed'].includes(latestOrder?.status);
          if (!isTerminal) {
            currentOrderRef.current = latestOrder;
            chatManager.set(chatId, { currentOrder: latestOrder });
            useOrderStore.getState().mergeCurrentOrder(chatId, latestOrder);
          }
        }
      } catch (_) { }

      if (!latestOrder) {
        console.warn('[handleChatHistory] no order on first fetch — retrying in 2s');
        await new Promise(r => setTimeout(r, 2000));
        try {
          const retry = await dispatch(fetchOrderByChatId(chatId)).unwrap();
          if (retry) latestOrder = retry?.data ?? retry;
        } catch (_) { }
      }

      if (!msgs?.length) return;

      const isTerminalOrder = ['completed', 'cancelled', 'task_completed'].includes(latestOrder?.status);
      const seenPayment = new Set();

      const filtered = msgs.filter(msg => {
        if (isTerminalOrder) {
          const orderCompletedAt = latestOrder?.completedAt || latestOrder?.updatedAt;
          const msgIsOld = orderCompletedAt
            ? new Date(msg.createdAt) < new Date(orderCompletedAt)
            : true;
          if (msgIsOld) {
            if (msg.type === 'system' && msg.text?.includes('joined the chat')) return false;
            if (msg.type === 'payment_request' || msg.messageType === 'payment_request') return false;
          }
        }
        const isPay = (msg.type === 'system' && msg.text?.toLowerCase().includes('made payment for this task'))
          || msg.paymentConfirmed === true || msg.type === 'payment_confirmed';
        if (isPay) {
          const key = msg.text || 'payment';
          if (seenPayment.has(key)) return false;
          seenPayment.add(key);
        }
        return true;
      });

      const formatted = filtered.map(msg => {
        const isSys = msg.from === 'system' || msg.type === 'system'
          || msg.messageType === 'system' || msg.senderType === 'system'
          || msg.senderId === 'system';
        return {
          ...msg,
          from: isSys ? 'system' : (msg.senderId === runnerId ? 'me' : 'them'),
          type: msg.type || msg.messageType || 'text',
        };
      });

      const existingState = chatManager.get(chatId);
      const existingOrderId =
        existingState.currentOrder?.orderId ??
        useOrderStore.getState().getChat(chatId).currentOrder?.orderId ??
        null;

      const sameOrder =
        !!existingOrderId && !!latestOrder?.orderId && existingOrderId === latestOrder.orderId;

      const sameMessages =
        !!existingState.messages?.length &&
        existingState.messages.length === formatted.length &&
        existingState.messages.every((m, i) => m.id === formatted[i]?.id);

      const skipPersist = isTerminalOrder && sameOrder && sameMessages;

      if (!skipPersist) {
        chatManager.set(chatId, { messages: formatted });
      }

      if (activeChatIdRef.current === chatId) {
        if (activeSetMessagesRef.current) {
          activeSetMessagesRef.current(formatted);
        } else {
          let attempts = 0;
          const tryPush = () => {
            attempts++;
            if (activeSetMessagesRef.current && activeChatIdRef.current === chatId) {
              activeSetMessagesRef.current(formatted);
            } else if (attempts < 10) {
              setTimeout(tryPush, 100);
            }
          };
          setTimeout(tryPush, 100);
        }
      }

      const lastRealMsg = [...formatted].reverse().find(
        m => m.from !== 'system' && m.type !== 'system' && m.messageType !== 'system'
      );
      if (lastRealMsg) {
        setChatHistory(prev => mergeChatHistory(prev, [{
          id: selectedUser._id,
          userId: selectedUser._id,
          chatId: chatId,
          lastMessage: lastRealMsg.text?.substring(0, 30) || '',
          time: lastRealMsg.time || '',
          name: `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || 'User',
        }]));
      }

      const isCompleted = formatted.some(m =>
        m.type === 'task_completed' || m.messageType === 'task_completed'
        || m.type === 'task_completed_marker' || m.messageType === 'task_completed_marker'
        || (m.type === 'system' && m.text?.toLowerCase().includes('task completed'))
      );
      if (isCompleted) {
        chatManager.set(chatId, { taskCompleted: true });
        useOrderStore.getState().setTaskCompleted(chatId, true);
      }

      const cancelMsg = formatted.find(m =>
        m.type === 'system' && m.text?.toLowerCase().includes('cancelled this order')
      );
      if (cancelMsg) {
        const by = cancelMsg.text?.split(' ')[0] || 'Runner';
        chatManager.set(chatId, { orderCancelled: true, cancellationReason: by });
        useOrderStore.getState().setOrderCancelled(chatId, by);
      }
    };

    const doJoin = () => {
      if (joined) {
        console.log('[RAW doJoin] BLOCKED — already joined');
        return;
      }
      joined = true;
      console.log('[RAW doJoin] emitting runnerJoinChat', { chatId, runnerId, socketId: socket?.id });

      clearTimeout(fallbackTimer);
      socket.off('proceedToChat', handleProceedToChat);
      socket.emit('runnerJoinChat', {
        runnerId,
        userId: selectedUser._id,
        chatId,
        serviceType: selectedUser.serviceType ?? selectedUser.currentRequest?.serviceType ?? null,
      });
    };

    const handleProceedToChat = async (data) => {
      if (data.chatId !== chatId || !data.chatReady) return;
      console.log('[raw.jsx] proceedToChat received, isRefresh:', data.isRefresh);

      if (runnerId) {
        const result = await dispatch(fetchRefreshRecentChats(runnerId)).unwrap();
        const resultChats = Array.isArray(result) ? result : (result?.chats || result?.data || []);
        const cleanResultChats = resultChats.filter(c =>
          c.id !== BOT_CHAT_ID &&
          !c.chatId?.startsWith('bot-') &&
          !c.id?.toString?.().startsWith?.('bot-')
        );
        if (cleanResultChats.length) {
          setCachedRecentChats(runnerId, cleanResultChats);
          setChatHistory(prev => mergeChatHistory(prev, cleanResultChats));
        }
      }

      if (data.isRefresh) {
        chatManager.set(chatId, {
          messages: [],
          currentOrder: null,
          taskCompleted: false,
          orderCancelled: false,
          cancellationReason: null,
          completedOrderStatuses: [],
          deliveryMarked: false,
          userConfirmedDelivery: false,
        });
        useOrderStore.getState()._patch(chatId, {
          currentOrder: null,
          taskCompleted: false,
          orderCancelled: false,
          cancellationReason: null,
          completedStatuses: [],
          deliveryMarked: false,
          userConfirmedDelivery: false,
          orderMissing: false,
        });
        currentOrderRef.current = null;
      }

      joined = false;
      doJoin();
    };

    const handleSessionRefreshOk = ({ chatId: inc, orderChanged }) => {
      if (inc !== chatId) return;
      console.log('[raw.jsx] sessionRefreshOk — rejoining');

      if (orderChanged) {
        joined = false;
        doJoin();
      } else {
        socket.emit('runnerJoinChat', {
          chatId,
          runnerId,
          userId: selectedUser._id,
          serviceType: selectedUser.serviceType ?? selectedUser.currentRequest?.serviceType ?? null,
        });
      }
    };

    const handleReconnect = () => {
      console.log('[RAW handleReconnect] fired', { chatId, socketId: socket?.id });

      socket.emit('joinRunnerRoom', {
        runnerId,
        serviceType: selectedUser?.serviceType ?? null,
      });

      const orderId = currentOrderRef.current?.orderId;
      if (orderId) {
        socket.emit('requestSessionRefresh', {
          chatId,
          orderId,
          userId: runnerId,
          userType: 'runner',
        });
      } else {
        joined = false;
        doJoin();
      }
    };

    const isReconnect = chatManager.get(chatId).messages.length > 0;

    if (isReconnect) {
      doJoin();
    } else {
      socket.on('proceedToChat', handleProceedToChat);
      fallbackTimer = setTimeout(() => {
        console.warn('[raw.jsx] proceedToChat timeout — joining directly');
        doJoin();
      }, 5000);
    }

    socket.on('chatHistory', handleChatHistory);
    socket.on('sessionRefreshOk', handleSessionRefreshOk);
    socket.on('connect', handleReconnect);

    return () => {
      clearTimeout(fallbackTimer);
      socket.off('proceedToChat', handleProceedToChat);
      socket.off('chatHistory', handleChatHistory);
      socket.off('sessionRefreshOk', handleSessionRefreshOk);
      socket.off('connect', handleReconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?._id, socket, runnerId, dispatch, chatSessionKey]);
}