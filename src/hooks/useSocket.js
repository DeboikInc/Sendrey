import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

// const SOCKET_URL = process.env.REACT_APP_SOCKET_URL_LOCAL;
const SOCKET_URL = "http://localhost:4001";
console.log("Connecting to:", SOCKET_URL);

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Prevent multiple connections
    if (socketRef.current) return;

    const s = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      console.log('✅ Socket connected:', s.id);
      socketRef.current = s;
      setSocket(s);
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    s.on('connect_error', (error) => {
      console.error('Socket Connection Error:', error);
    });

    return () => {
      if (s) {
        s.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const joinRunnerRoom = useCallback((runnerId, serviceType) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('joinRunnerRoom', { runnerId, serviceType });
      console.log(`Joining runner room: runners-${serviceType}`);
    }
  }, []);

  const joinChat = useCallback((chatId, onChatHistory, onMessage) => {
    const s = socketRef.current;
    if (!s?.connected) return;

    s.off('chatHistory');
    s.off('message');

    s.emit('joinChat', chatId);
    s.on('chatHistory', onChatHistory);
    s.on('message', onMessage);

    console.log(`Joined chat: ${chatId}`);
  }, []);

  const sendMessage = useCallback((chatId, message) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('sendMessage', { chatId, message });
    }
  }, []);

  const pickService = useCallback((requestId, runnerId, runnerName) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('pickService', { requestId, runnerId, runnerName });
    }
  }, []);

  const onNewServiceRequest = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('newServiceRequest', callback);
    }
  }, []);

  const onServicePicked = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('servicePicked', callback);
    }
  }, []);

  const onExistingRequests = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('existingRequests', callback);
    }
  }, []);

  const onRunnerAccepted = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('runnerAccepted', callback);
    }
  }, []);

  return {
    socket,
    isConnected,
    joinRunnerRoom,
    joinChat,
    sendMessage,
    pickService,
    onNewServiceRequest,
    onServicePicked,
    onExistingRequests,
    onRunnerAccepted
  };
};