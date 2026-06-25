const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const redis = require('./config/redis');

const { database } = require("./config/index");

// handlers
const socketHandlers = require("./socket/socketHandlers");
const chatStatusHandlers = require('./socket/chatStatusHandlers');
const fileUploadHandlers = require('./socket/fileUploadHandlers');
const notificationHandlers = require('./socket/notificationHandlers');
const { handleRunnerAccept } = require('./socket/orderHandlers');
const { handleSubmitItems,
  handleApproveItems,
  handleRejectItems,
  handleSubmitPickupItem,
  handleApprovePickupItem,
  handleRejectPickupItem } = require("./socket/itemHandlers");
const { handleMarkDeliveryComplete, handleConfirmDelivery, handleDenyDelivery } = require('./socket/deliveryHandlers');
const { handleRaiseDispute, handleResolveDispute } = require('./socket/disputeHandlers');
const { handleSubmitRating } = require('./socket/ratingHandlers');
const callHandlers = require("./socket/callHandlers");
const { handlePaymentSuccess } = require('./socket/paymentHandlers');
const { handleGetRunnerPayout, handleSubmitPayoutReceipt } = require('./socket/payoutHandlers');
const { registerTrackingHandlers } = require('./socket/trackingHandlers');
const { handleCancelOrder, handleTaskCompleted, handleRunnerStartedNewOrder } = require('./socket/terminalHandlers');
const { handleGetOrderByChatId } = require('./socket/orderByChatIdHandlers');
const { registerPresenceHandlers, handleUserDisconnect } = require('./socket/presenceHandlers');
const { flushPendingWrites, handleGetLastSeq, handleGetMissedMessages } = require('./socket/messageHandlers');
const logger = require('./utils/logger');

// Import models
const { Chat } = require("./models/Chat");
const ServiceRequest = require("./models/ServiceRequest");
const User = require('./models/User');

const { startScheduler } = require('./services/scheduleService');

const { enqueue, dequeue, getAll, markAttempt, shouldRetry } = require('./utils/pendingTaskQueue');

require('events').EventEmitter.defaultMaxListeners = 20;

let ioInstance;
let serverInstance;


async function startSocketServer(app) {
  logger.info('socket started successfully')

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 5e6,
    perMessageDeflate: {
      threshold: 512,
      zlibDeflateOptions: { level: 6 },
      zlibInflateOptions: { chunkSize: 16 * 1024 },
    },
    connectTimeout: 45000,
    allowUpgrades: true,
    cookie: false,
    upgradeTimeout: 10000,
    destroyUpgrade: true,
    httpCompression: true,
  });

  ioInstance = io;
  serverInstance = server;

  setInterval(async () => {
    if (mongoose.connection.readyState !== 1) return;
    for (const [key, item] of getAll()) {
      if (!shouldRetry(key)) continue;
      markAttempt(key);
      console.log(`[socketQueue] retrying [${key}] attempt ${item.attempts}`);
      try {
        await item.handler(...item.args);
        dequeue(key);
        console.log(`[socketQueue] success [${key}]`);
      } catch (err) {
        console.error(`[socketQueue] retry failed [${key}]:`, err.message);
        if (item.attempts >= 10) {
          console.error(`[socketQueue] giving up [${key}]`);
          dequeue(key);
        }
      }
    }
  }, 30000);

  mongoose.connection.on('reconnected', () => {
    console.log('[DB] reconnected — flushing socket queue');
    for (const [key, item] of getAll()) {
      markAttempt(key);
      item.handler(...item.args)
        .then(() => { dequeue(key); console.log(`[socketQueue] flushed [${key}]`); })
        .catch(err => console.error(`[socketQueue] flush failed [${key}]:`, err.message));
    }
  });

  app.set('io', io);
  startScheduler(io);

  io.use((socket, next) => {
    console.log(`Connection attempt from ${socket.id} with transport: ${socket.conn.transport.name}`);
    next();
  });

  try {
    const subscriber = redis.getSubscriber();
    await subscriber.subscribe('kyc:events', (err, count) => {
      if (err) {
        console.error('Failed to subscribe to kyc:events:', err);
      } else {
        console.log(`✅ Subscribed to kyc:events (${count} channels)`);
      }
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'kyc:events') {
        try {
          const payload = JSON.parse(message);
          console.log(`[Redis] Received on ${channel}:`, payload);
          const { runnerId, data } = payload;
          const room = `runner-${runnerId}`;
          console.log(`[Redis] Emitting to room: ${room}`, data);
          ioInstance.to(room).emit('verificationStatus', data);
          console.log(`[Redis] Emitted to ${room}`);
        } catch (error) {
          console.error('[Redis] Failed to process KYC event:', error);
        }
      }
    });

    console.log('✅ Redis connected (socket server)');
  } catch (err) {
    console.error('Redis unavailable in socket server:', err.message);
  }

  io.on("connection", (socket) => {
    console.log("✅ New client connected:", socket.id, "Transport:", socket.conn.transport.name);

    // Send immediate acknowledgment
    socket.emit("connected", { id: socket.id, timestamp: Date.now() });

    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 15000);

    socket.on("pong", () => {
      console.log(`Heartbeat from ${socket.id}`);
    });

    // Wrap all handlers in try-catch to prevent crashes
    const safeHandler = async (handler, ...args) => {
      try {
        return await handler(...args);
      } catch (error) {
        console.error(`Error in handler [${handler.name}]:`, error.message);
        socket.emit('error', { message: 'Internal server error', detail: error.message });

        const isDbError =
          error.name === 'MongoServerSelectionError' ||
          error.name === 'MongoNetworkError' ||
          error.message?.includes('ENOTFOUND') ||
          error.message?.includes('buffering timed out') ||
          error.message?.includes('topology was destroyed');

        if (isDbError) {
          const key = `${handler.name}-${Date.now()}`;
          console.log(`[socketQueue] DB error — queuing ${key} for retry`);
          enqueue(key, handler, args);
        }

        return null;
      }
    };

    // online/offline handlers
    registerPresenceHandlers(socket, io, safeHandler)

    // rejoin chat
    socket.on("rejoinChat", (data) =>
      safeHandler(socketHandlers.handleRejoinChat, socket, io, data)

    );

    socket.on("runnerReconnect", (data) =>
      safeHandler(socketHandlers.handleRunnerReconnect, socket, io, data)

    );


    socket.on('getOrderSession', (data) =>
      safeHandler(socketHandlers.handleGetOrderSession, socket, data)
    );

    socket.on('requestSessionRefresh', (data) =>
      safeHandler(socketHandlers.requestSessionRefresh, socket, data)
    );

    // Runner events
    socket.on("joinRunnerRoom", (data) =>
      safeHandler(socketHandlers.handleJoinRunnerRoom, socket, data)
    );

    socket.on("getArchivedMessages", (data) =>
      safeHandler(socketHandlers.handleGetArchivedMessages, socket, data)
    );

    socket.on("acceptRunnerRequest", async (data) => {
      const { chatId } = data;
      if (socket._acceptingChat === chatId) return; // dedup guard
      socket._acceptingChat = chatId;

      try {
        const result = await safeHandler(socketHandlers.handleAcceptRunnerRequest, socket, io, data);
        if (result === null) {
          socket._acceptingChat = null;
          return;
        }
        await handleRunnerAccept(io, socket, data);
      } finally {
        setTimeout(() => { socket._acceptingChat = null; }, 5000);
      }
    });

    // user 
    socket.on("requestRunner", (data) =>
      safeHandler(socketHandlers.handleRequestRunner, socket, io, data)
    );

    socket.on("userJoinChat", async (data) => {
      const result = await safeHandler(socketHandlers.handleUserJoinChat, socket, io, data);
      if (result === null) {
        socket.emit("chatError", {
          message: "Failed to join chat. Please try again.",
          code: "JOIN_FAILED"
        });
      }
    });

    socket.on("runnerJoinChat", async (data) => {
      const result = await safeHandler(socketHandlers.handleRunnerJoinChat, socket, io, data);
      if (result === null) {
        socket.emit("chatError", {
          message: "Failed to join chat. Please try again.",
          code: "JOIN_FAILED"
        });
        return; // don't attempt to join room if handler blew up
      }
      setTimeout(() => {
        const rooms = Array.from(socket.rooms);
        console.log('Runner socket rooms after join:', rooms);
      }, 500);
    });

    // Push Notification events
    socket.on('saveFcmToken', (data) => {
      console.log('[saveFcmToken] event received:', data?.userId, data?.userType, !!data?.fcmToken);
      notificationHandlers.handleSaveFcmToken(socket, data);
    });

    socket.on("sendMessage", async (data) => {
      try {
        await socketHandlers.handleSendMessage(socket, io, data);

        const { chatId, message } = data;
        if (chatId && message?.senderId && message?.senderType) {
          await notificationHandlers.sendMessageNotification(
            chatId,
            message,
            message.senderId,
            message.senderType
          );
        }
      } catch (error) {
        console.error('SendMessage error:', error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Status update event
    socket.on("updateStatus", async (data, callback) => {
      try {
        const room = io.sockets.adapter.rooms.get(data.chatId);
        console.log(`Room ${data.chatId} has ${room?.size || 0} sockets:`, Array.from(room || []));
        await chatStatusHandlers.handleUpdateStatus(socket, io, data, callback);
        await notificationHandlers.sendStatusUpdateNotification(
          data.chatId,
          data.status,
          data.updatedBy,
          data.updatedByType
        );
      } catch (error) {
        console.error('UpdateStatus error:', error);
        socket.emit("error", { message: "Failed to update status" });
      }
    });

    // Media message event
    socket.on("sendMedia", (data) =>
      safeHandler(chatStatusHandlers.handleSendMedia, socket, io, data)
    );

    // LEGACY: joinChat
    socket.on("joinChat", async (data) => {
      try {
        const { chatId, taskId, serviceType } = data;
        console.log('joinChat (legacy/readonly) received:', { chatId, taskId, serviceType });
        socket.join(chatId);
        const chat = await Chat.findOne({ chatId });
        setTimeout(() => {
          socket.emit("chatHistory", chat ? chat.messages : []);
        }, 100);
      } catch (error) {
        console.error('JoinChat error:', error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    socket.on("uploadFile", (data) =>
      safeHandler(fileUploadHandlers.handleFileUpload, socket, io, data)
    );

    socket.on("deleteMessage", (data) =>
      safeHandler(socketHandlers.handleDeleteMessage, socket, io, data)
    );

    // Tracking event
    socket.on("startTrackRunner", (data) =>
      safeHandler(socketHandlers.handleStartTrackRunner, io, data)
    );

    // call
    socket.on('rejoinUserRoom', ({ userId, userType }) => {
      try {
        const room = userType === 'runner' ? `runner-${userId}` : `user-${userId}`;
        socket.join(room);
        const roomSockets = io.sockets.adapter.rooms.get(room);
        console.log(` ${userType || 'User'} ${userId} re-joined personal room: ${room}`);
        console.log(`Room ${room} now has ${roomSockets?.size || 0} sockets:`, Array.from(roomSockets || []));
      } catch (error) {
        console.error('RejoinUserRoom error:', error);
      }
    });

    callHandlers.register(socket, io);

    // typing indicator
    socket.on('typing', ({ chatId, userId, userType, isTyping }) => {
      try {
        console.log(`${userType} ${userId} ${isTyping ? 'started' : 'stopped'} typing in ${chatId}`);
        socket.to(chatId).emit('userTyping', {
          userId,
          userType,
          isTyping,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Typing error:', error);
      }
    });

    // recording
    socket.on('recording', ({ chatId, userId, userType, isRecording }) => {
      try {
        console.log(`${userType} ${userId} ${isRecording ? 'started' : 'stopped'} recording in ${chatId}`);
        socket.to(chatId).emit('userRecording', {
          userId,
          userType,
          isRecording,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Recording error:', error);
      }
    });

    socket.on("getOrderByChatId", (data) => {
      safeHandler(handleGetOrderByChatId, socket, data)
    });

    // message handlers
    socket.on('getLastSeq', (data) => safeHandler(handleGetLastSeq, socket, data));
    socket.on('getMissedMessages', (data) => safeHandler(handleGetMissedMessages, socket, data));

    // items
    socket.on("submitItems", (data) => safeHandler(handleSubmitItems, socket, io, data));
    socket.on("approveItems", (data) => safeHandler(handleApproveItems, socket, io, data));
    socket.on("rejectItems", (data) => safeHandler(handleRejectItems, socket, io, data));

    socket.on("submitPickupItem", (data) => safeHandler(handleSubmitPickupItem, socket, io, data));
    socket.on("approvePickupItem", (data) => safeHandler(handleApprovePickupItem, socket, io, data));
    socket.on("rejectPickupItem", (data) => safeHandler(handleRejectPickupItem, socket, io, data));

    // delivery handlers
    socket.on('markDeliveryComplete', (data) => safeHandler(handleMarkDeliveryComplete, io, socket, data));
    socket.on('confirmDelivery', (data) => safeHandler(handleConfirmDelivery, io, socket, data));
    socket.on('denyDelivery', (data) => safeHandler(handleDenyDelivery, io, socket, data));

    // dispute handlers
    socket.on('raiseDispute', (data) => safeHandler(handleRaiseDispute, socket, io, data));
    socket.on('resolveDispute', (data) => safeHandler(handleResolveDispute, socket, io, data));

    socket.on('submitRating', (data) => safeHandler(handleSubmitRating, socket, io, data));

    // Payment handler
    socket.on('paymentSuccess', (data) => safeHandler(handlePaymentSuccess, socket, io, data));

    // Payout handlers
    socket.on('getRunnerPayout', (data) => safeHandler(handleGetRunnerPayout, socket, io, data));
    socket.on('submitPayoutReceipt', (data) => safeHandler(handleSubmitPayoutReceipt, socket, io, data));

    registerTrackingHandlers(io, socket);

    // Error handler for the socket itself
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });

    // cancel an order
    socket.on('cancelOrder', (data) => safeHandler(handleCancelOrder, socket, io, data));
    socket.on('runnerStartedNewOrder', (data) => safeHandler(handleRunnerStartedNewOrder, socket, data));
    socket.on('taskCompleted', (data) => safeHandler(handleTaskCompleted, io, data))

    // Disconnect
    socket.on("disconnect", (reason) => {
      console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
      clearInterval(heartbeatInterval);
      if (typeof handleUserDisconnect === 'function') safeHandler(handleUserDisconnect, socket, io);
      if (typeof socketHandlers.handleDisconnect === 'function') safeHandler(socketHandlers.handleDisconnect, socket, io);
    });
  });

  server.listen(process.env.PORT, () => console.log(`✅ Server running on port ${process.env.PORT}`));

  return { io, server };
}

// Called by app.js during own SIGTERM/SIGINT handling.
async function shutdownSocketServer() {
  const count = await flushPendingWrites();
  console.log('[shutdown flush] done, flushed', count, 'chats');
  if (ioInstance) {
    await new Promise((resolve) => ioInstance.close(() => {
      console.log('Socket.IO closed');
      resolve();
    }));
  }
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
}

module.exports.startSocketServer = startSocketServer;
module.exports.shutdownSocketServer = shutdownSocketServer;
module.exports.getIO = () => {
  if (!ioInstance) {
    console.warn('IO not initialized yet');
    return null;
  }
  return ioInstance;
};