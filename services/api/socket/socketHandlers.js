// socketHandlers.js
const { Chat } = require("../models/Chat");
const ServiceRequest = require("../models/ServiceRequest");
const User = require("../models/User");
const Runner = require("../models/Runner");
const Order = require("../models/Order");
const Escrow = require('../models/Escrows');
const { notifyPaymentRequest } = require('../services/notificationService');
const { logMetric } = require('../utils/metricsLogger');
const { canRunnerAcceptErrand, incrementErrandCount } = require('../utils/verificationCheck');
const { logSocketAudit } = require('../utils/socketAudit');

const { computeDeliveryFeeFromDocs, calculateFeeSplit } = require('../config/pricing');
const { getPricingConfig } = require('../services/pricingService');

const {
  socketMessageSnapshot,
  pendingWrites,
  stripForTransport,
  cleanForEmit,
  deduplicateMessages,
  deduplicateAndPersist,
  snapshotMessage,
  handleSendMessage,
  handleDeleteMessage,
  handleGetSpecialInstructions,
} = require('./messageHandlers');

// ─── Global state ─────────────────────────────────────────────────────────────

const runnersByService = {
  "pick-up": new Set(),
  "run-errand": new Set(),
};

const preRoomState = new Map();
const joiningChats = new Set();


const sanitizeSpecialInstructions = (specialInstructions) => {
  console.log('[sanitize] input:', JSON.stringify(specialInstructions, null, 2));
  if (!specialInstructions) return null;
  return {
    text: specialInstructions.text || null,
    media: (specialInstructions.media || []).map(m => {
      // console.log('[sanitize] media item:', JSON.stringify(m, null, 2));
      return {
        fileName: m.fileName || m.name || null,
        fileType: m.fileType || m.type || null,
        fileSize: m.fileSize || null,
        fileUrl: m.fileUrl || null,
      };
    }),
  };
};

// ─── Archive current messages into orderSessions ──────────────────────────────

const archiveCurrentSession = async (chatId, orderId, status = 'completed') => {
  console.log(`[archive] Called with orderId: ${orderId}, type: ${typeof orderId}`);

  if (!orderId) {
    console.warn(`[archive] Skipping archive - missing orderId for chat ${chatId}`);
    return;
  }

  const chat = await Chat.findOne({ chatId });
  if (!chat || !chat.messages.length) {
    console.log('[archive] No chat or empty messages — skipping');  // ADD
    return;
  }

  const hasRealContent = chat.messages.some(m =>
    m.type !== 'system' || !m.text?.includes('joined the chat')
  );
  if (!hasRealContent) return;

  const order = await Order.findOne({ orderId }).sort({ createdAt: -1 }).lean();

  const sessionObj = {
    orderId,
    startedAt: chat.createdAt || new Date(),
    completedAt: new Date(),
    status,
    messages: chat.messages,
    orderData: {
      chatId: order?.chatId,
      orderId: order?.orderId || orderId,
      serviceType: order?.serviceType,
      taskType: order?.taskType,
      status: order?.status,
      paymentStatus: order?.paymentStatus,
      itemBudget: order?.itemBudget,
      deliveryFee: order?.deliveryFee,
      totalAmount: order?.totalAmount,
      platformFee: order?.platformFee,
      runnerPayout: order?.runnerPayout,
      usedPayoutSystem: order?.usedPayoutSystem,
      pickupLocation: order?.pickupLocation,
      pickupCoordinates: order?.pickupCoordinates,
      deliveryLocation: order?.deliveryLocation,
      deliveryCoordinates: order?.deliveryCoordinates,
      marketLocation: order?.marketLocation,
      marketCoordinates: order?.marketCoordinates,
      routeDistanceMeters: order?.routeDistanceMeters,
      routeLegs: order?.routeLegs,
      fleetType: order?.fleetType,
      specialInstructions: order?.specialInstructions,
      createdAt: order?.createdAt,
      completedAt: order?.completedAt || new Date(),
      deliveryConfirmedAt: order?.deliveryConfirmedAt,
      statusHistory: order?.statusHistory,
    },
    runnerInfo: order?.runnerId ? { runnerId: order.runnerId } : null,
    userInfo: order?.userId ? { userId: order.userId } : null,
  };

  console.log(`[archive] Session object orderId: ${sessionObj.orderId}`);

  await Chat.findOneAndUpdate(
    { chatId },
    { $push: { orderSessions: sessionObj } },
    { upsert: true }
  );

  console.log(`[archive] Order ${orderId} archived with full data, status: ${status}`);
};

// ─── Message builders ─────────────────────────────────────────────────────────

const createInitialRunnerMessages = (runnerData, serviceType, runnerId) => {
  const fullName = `${runnerData?.firstName || ""} ${runnerData?.lastName || ""}`.trim();
  logSocketAudit('INITIAL_RUNNER_MESSAGE', { runnerData, runnerId, serviceType });

  return [
    {
      id: Date.now().toString(),
      from: "system",
      messageType: "system",
      type: "system",
      text: `Runner ${fullName} joined the chat`,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      senderId: runnerId,
      senderType: "runner",
      status: "sent",
      createdAt: new Date(),
    },
    {
      id: (Date.now() + 1).toString(),
      from: "them",
      messageType: "profile-card",
      type: "profile-card",
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      senderId: runnerId,
      senderType: "runner",
      status: "sent",
      createdAt: new Date(),
      runnerInfo: {
        firstName: runnerData?.firstName,
        lastName: runnerData?.lastName || "",
        avatar: runnerData?.avatar || null,
        rating: runnerData?.rating > 0 ? runnerData.rating : null,
        bio: `Hello I am ${fullName} and I will be your captain for this ${serviceType.replace("-", " ")}. I am dedicated to helping you get your tasks done efficiently and effectively.`,
      },
    },
  ];
};

const buildPaymentRequestMsg = (order, chatId, userId, runnerId) => ({
  id: `payment-prompt-${Date.now()}`,
  from: 'system',
  type: 'payment_request',
  messageType: 'payment_request',
  time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  senderId: 'system',
  senderType: 'system',
  status: 'sent',
  createdAt: new Date(),
  paymentData: {
    serviceType: order.serviceType,
    itemBudget: order.itemBudget || 0,
    deliveryFee: order.deliveryFee || 0,
    totalAmount: order.totalAmount || 0,
    currency: 'NGN',
    chatId,
    userId,
    runnerId,
    orderId: order.orderId,
  },
});

// ─── createOrder: single source of truth ─────────────────────────────────────
//
// Creates the order document, injects the payment_request message into chat,
// and broadcasts orderCreated + chatHistory to both parties.
// Called only once per session, after both parties are confirmed in-room.
//
const createOrder = async (io, { chatId, userId, runnerId, serviceType }) => {
  console.log('[createOrder] Starting for chatId:', chatId);

  // ── 1. Fetch all data needed for pricing in ONE parallel round-trip ─────────
  const [runnerDoc, userDoc, chatDoc] = await Promise.all([
    Runner.findById(runnerId).lean(),
    User.findById(userId).lean(),
    Chat.findOne({ chatId }).lean(),
  ]);

  if (!userDoc?.currentRequest || !userDoc.currentRequest.serviceType) {
    console.warn('[createOrder] No active currentRequest for user:', userId);
    io.to(`user-${userId}`).emit('chatError', {
      code: 'NO_ACTIVE_REQUEST',
      message: 'Your request has expired or was not found. Please start a new request.',
      chatId,
    });
    io.to(`runner-${runnerId}`).emit('chatError', {
      code: 'NO_ACTIVE_REQUEST',
      message: 'User has no active request. The session cannot continue.',
      chatId,
    });
    throw Object.assign(new Error('No active currentRequest'), { statusCode: 400 });
  }

  const fleetType = chatDoc?.fleetType || userDoc?.currentRequest?.fleetType;
  const resolvedServiceType = serviceType || userDoc?.currentRequest?.serviceType || chatDoc?.serviceType;

  if (resolvedServiceType !== userDoc.currentRequest.serviceType) {
    console.warn('[createOrder] serviceType mismatch — chat:', resolvedServiceType, 'request:', userDoc.currentRequest.serviceType);
    io.to(`user-${userId}`).emit('chatError', {
      code: 'REQUEST_MISMATCH',
      message: 'Your active request does not match this chat session.',
      chatId,
    });
    throw Object.assign(new Error('serviceType mismatch'), { statusCode: 400 });
  }


  const { deliveryFee, distanceInMeters, legs } = await computeDeliveryFeeFromDocs(resolvedServiceType, userDoc, fleetType);

  const isErrand = resolvedServiceType === 'run-errand';
  const itemBudget = isErrand
    ? Number(userDoc?.currentRequest?.itemBudget || userDoc?.currentRequest?.budget) || 0
    : 0;
  const totalAmount = itemBudget + deliveryFee;

  const pricingConfig = await getPricingConfig();
  const { platformFee, runnerPayout, providerFee, netPlatformFee } = calculateFeeSplit(deliveryFee, fleetType, pricingConfig);

  const request = userDoc?.currentRequest || {};
  const orderId = Order.generateOrderId();
  const now = new Date();

  const validCoords = (c) => (c?.lat && c?.lng) ? c : null;

  const orderDoc = {
    orderId,
    chatId,
    userId,
    runnerId,
    serviceType: resolvedServiceType,
    taskType: isErrand ? 'run-errand' : 'pick-up',
    pickupLocation: request.pickupLocation ? { address: request.pickupLocation } : null,
    deliveryLocation: request.deliveryLocation ? { address: request.deliveryLocation } : null,
    marketLocation: request.marketLocation ? { address: request.marketLocation } : null,

    marketCoordinates: validCoords(request.marketCoordinates),
    pickupCoordinates: validCoords(request.pickupCoordinates),
    deliveryCoordinates: validCoords(request.deliveryCoordinates),
    // phones
    pickupPhone: request.pickupPhone || null,
    dropoffPhone: request.dropoffPhone || null,
    routeDistanceMeters: Math.round(distanceInMeters || 0),
    routeLegs: legs || {},

    itemBudget,
    deliveryFee,
    totalAmount,
    platformFee,
    runnerPayout,
    providerFee,
    netPlatformFee,

    specialInstructions: request.specialInstructions || null,
    pickupItems: request.pickupItems || null,
    marketItems: request.marketItems || null,
    fleetType: request.fleetType || fleetType || null,
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    approvalStatus: isErrand ? 'pending' : 'not_required',
    statusHistory: [{
      status: 'pending_payment',
      timestamp: now,
      triggeredBy: 'system',
      note: 'Order created on session start',
    }],
    createdAt: now,
    updatedAt: now,
  };

  const paymentRequestMsg = {
    id: `payment-prompt-${Date.now()}`,
    from: 'system',
    type: 'payment_request',
    messageType: 'payment_request',
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    senderId: 'system',
    senderType: 'system',
    status: 'sent',
    createdAt: now,
    paymentData: {
      serviceType: resolvedServiceType,
      itemBudget,
      deliveryFee,
      totalAmount,
      currency: 'NGN',
      chatId,
      userId,
      runnerId,
      orderId,
    },
  };

  // ── 2. Fire all writes in parallel — none depend on each other ───────────────
  const [order] = await Promise.all([
    // Insert order (insertMany returns array, we take first)
    Order.insertMany([orderDoc], { ordered: true }).then(docs => docs[0]),

    // Cancel stale orders for this chat
    Order.updateMany(
      {
        chatId,
        status: { $nin: ['completed', 'cancelled', 'task_completed'] },
        paymentStatus: { $ne: 'paid' },
        orderId: { $ne: orderId }, // don't cancel the one we just made
      },
      {
        $set: { status: 'cancelled', cancelledAt: now, cancelReason: 'new_session_started' },
        $push: { statusHistory: { status: 'cancelled', timestamp: now, triggeredBy: 'system', note: 'Superseded by new session' } },
      }
    ),

    // Inject payment_request into chat + pin orderId
    Chat.findOneAndUpdate(
      { chatId },
      {
        $push: { messages: paymentRequestMsg },
        $set: { orderId, taskId: orderId, lastActivity: now },
      },
      { new: true }
    ),

    // Mark runner & user busy
    Runner.findByIdAndUpdate(runnerId, { activeOrderId: orderId }),
    User.findByIdAndUpdate(userId, { activeOrderId: orderId }),
  ]);

  console.log('[createOrder] Order created:', orderId);

  // ── 3. Read the final chat state (needed for chatHistory emit) ───────────────
  const finalChat = await Chat.findOne({ chatId }).lean();
  const cleanMessages = deduplicateMessages(finalChat.messages);

  // ── 4. Build lean payload and broadcast ──────────────────────────────────────
  const orderPayload = {
    orderId,
    chatId,
    orderId,
    itemBudget,
    deliveryFee,
    totalAmount,
    runnerPayout,
    taskType: orderDoc.taskType,
    serviceType: resolvedServiceType,
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    approvalStatus: orderDoc.approvalStatus,
    marketLocation: orderDoc.marketLocation,
    deliveryLocation: orderDoc.deliveryLocation,
    pickupLocation: orderDoc.pickupLocation,
    marketCoordinates: orderDoc.marketCoordinates,
    deliveryCoordinates: orderDoc.deliveryCoordinates,
    pickupCoordinates: orderDoc.pickupCoordinates,

    pickupItems: orderDoc.pickupItems || null,
    marketItems: orderDoc.marketItems || null,
    itemsList: orderDoc.itemsList || [],
    specialInstructions: orderDoc.specialInstructions || null,

    pickupPhone: orderDoc.pickupPhone || null,
    dropoffPhone: orderDoc.dropoffPhone || null,
  };

  console.log('[createOrder] orderPayload.serviceType:', orderPayload.serviceType);
  console.log('[createOrder] resolvedServiceType:', resolvedServiceType);
  console.log('[createOrder] userDoc.currentRequest:', JSON.stringify(userDoc?.currentRequest, null, 2));

  // Emit orderCreated first so clients can set up state before history arrives
  io.to(`user-${userId}`).emit('orderCreated', { order: orderPayload, isNewOrder: true });
  io.to(`runner-${runnerId}`).emit('orderCreated', { order: orderPayload, isNewOrder: true });
  io.to(chatId).emit('chatHistory', cleanMessages);

  console.log('[createOrder] Broadcast complete. Messages:', cleanMessages.length);

  // ── 5. Non-blocking post-processing — don't await these ──────────────────────
  notifyPaymentRequest(userId, { orderId, amount: totalAmount }).catch(e =>
    console.error('[createOrder] notifyPaymentRequest failed:', e.message)
  );
  logSocketAudit('ORDER_CREATED', { orderId, chatId, userId, runnerId });

  return { order, cleanMessages };
};

// ─── Room handlers ────────────────────────────────────────────────────────────

const handleJoinRunnerRoom = async (socket, { runnerId, serviceType, fleetType }) => {
  socket.runnerId = runnerId;
  socket.serviceType = serviceType;

  if (serviceType && runnersByService[serviceType]) {
    socket.join(`runners-${serviceType}`);
    runnersByService[serviceType].add(socket.id);
  }
  const room = `runner-${runnerId}`;
  socket.join(room);

  console.log(`[SOCKET SERVER] Runner ${runnerId} joined room ${room}`);

  await Runner.findByIdAndUpdate(runnerId, {
    activeServiceType: serviceType,
    activeFleetType: fleetType,
    isAvailable: true,
  });

  const verificationCheck = await canRunnerAcceptErrand(runnerId);
  socket.emit('verificationStatus', { ...verificationCheck, timestamp: new Date().toISOString() });

  const requests = await ServiceRequest.find({ serviceType, status: "available" });
  socket.emit("existingRequests", requests);

  logSocketAudit('RUNNER_JOINED_ROOM', { runnerId, serviceType });
};

// ─── Pre-room: runner accepts ─────────────────────────────────────────────────
//
// Flow:
//   1. Runner accepts → joins pre-${chatId}, sets state.runner = true
//   2. Emits enterPreRoom to the user socket so user knows to join
//   3. If user is ALREADY in pre-room → proceed immediately via lockAndProceed
//   4. Otherwise start a 30s global timer; if user never shows → timeout
//
const handleAcceptRunnerRequest = async (socket, io, { runnerId, userId, chatId, serviceType }) => {
  console.log('[SERVER] ========== acceptRunnerRequest RECEIVED ==========');
  console.log('[SERVER] runnerId:', runnerId, '| userId:', userId, '| chatId:', chatId);

  try {
    const verificationCheck = await canRunnerAcceptErrand(runnerId);
    console.log('[acceptRunnerRequest] verificationCheck:', verificationCheck);

    if (!verificationCheck.canAccept) {
      console.log('[acceptRunnerRequest] BLOCKED — verification failed:', verificationCheck.reason)
      socket.emit('error', {
        message: verificationCheck.reason,
        code: 'VERIFICATION_FAILED',
        details: verificationCheck,
      });
      socket.emit('verificationStatus', { ...verificationCheck, timestamp: new Date().toISOString() });
      return;
    }

    // Check if user already created pre-room state
    let state = preRoomState.get(chatId);

    // If state exists and user already joined, proceed immediately
    if (state && state.user) {
      console.log('[acceptRunnerRequest] User already in pre-room! Proceeding immediately.');
      socket.join(`pre-${chatId}`);
      state.runner = true;
      state.runnerId = runnerId;
      socket.runnerId = runnerId;

      if (state.globalTimer) {
        clearTimeout(state.globalTimer);
        state.globalTimer = null;
      }

      await lockAndProceed(io, chatId, state);
      return;
    }

    // If no state exists, create one
    if (!state) {
      state = {
        user: false,
        runner: false,
        runnerId,
        userId,
        serviceType,
        timestamp: Date.now(),
      };
      preRoomState.set(chatId, state);
      console.log('[acceptRunnerRequest] Created new pre-room state');
    }

    // Join pre-room
    socket.join(`pre-${chatId}`);
    state.runner = true;
    state.runnerId = runnerId;
    socket.runnerId = runnerId;

    await incrementErrandCount(runnerId);

    // Tell user to enter pre-room
    const payload = {
      chatId,
      runnerId,
      userId,
      serviceType,
      message: 'Runner accepted! Preparing chat...'
    };
    io.to(`user-${userId}`).emit('enterPreRoom', payload);

    // Start timeout if not already started
    if (!state.globalTimer) {
      state.globalTimer = setTimeout(async () => {
        const s = preRoomState.get(chatId);
        if (s && (!s.user || !s.runner)) {
          console.warn('[preRoom] timeout — both parties never arrived for chatId:', chatId);
          preRoomState.delete(chatId);
          io.to(`pre-${chatId}`).emit('preRoomTimeout', { chatId, message: 'Connection timed out.' });
          io.to(`user-${userId}`).emit('preRoomTimeout', { chatId, message: 'Connection timed out.' });
        }
      }, 60000);
    }

    logSocketAudit('RUNNER_ACCEPTED_REQUEST', { runnerId, serviceType, chatId, userId });
  } catch (error) {
    console.error('[acceptRunnerRequest] error:', error);
    socket.emit('chatError', {
      code: 'ACCEPT_FAILED',
      message: 'Failed to accept request. Please try again.',
      chatId,
    });
  }
};

// ─── Pre-room: user responds to enterPreRoom ──────────────────────────────────
//
// Flow:
//   1. User receives enterPreRoom → client emits requestRunner
//   2. User joins pre-${chatId}, sets state.user = true
//   3. If runner is ALREADY in pre-room → proceed immediately via lockAndProceed
//   4. Otherwise start a 30s global timer; if runner never shows → timeout
//
const handleRequestRunner = async (socket, io, data) => {
  const { runnerId, userId, chatId, serviceType, specialInstructions, attemptToken } = data;
  console.log('[requestRunner] RECEIVED from socket:', socket.id, '| data:', JSON.stringify({ runnerId, userId, chatId, isReconnect: data.isReconnect }));

  try {
    socket.join(`user-${userId}`);

    // Check if runner already accepted before creating new state
    const existingState = preRoomState.get(chatId);

    // If runner already accepted and we have a state, check if we should proceed
    if (existingState && existingState.runner && !existingState.locked) {
      console.log('[requestRunner] Runner already in pre-room, checking if user should join...');

      // User joins pre-room
      socket.join(`pre-${chatId}`);
      existingState.user = true;
      existingState.userId = userId;
      existingState.specialInstructions = specialInstructions || null;
      existingState.attemptToken = attemptToken || null;

      console.log('[requestRunner] User joined existing pre-room. Proceeding immediately.');
      if (existingState.globalTimer) { clearTimeout(existingState.globalTimer); existingState.globalTimer = null; }
      await lockAndProceed(io, chatId, existingState);
      return;
    }

    // No existing state or runner hasn't accepted yet
    if (!preRoomState.has(chatId)) {
      preRoomState.set(chatId, {
        user: false, runner: false,
        runnerId, userId, serviceType,
        timestamp: Date.now(),
      });
    }

    const state = preRoomState.get(chatId);

    if (state.user && !data.isReconnect) {
      console.warn('[requestRunner] user already in pre-room for chatId:', chatId);

      const preRoomSockets = await io.in(`pre-${chatId}`).allSockets();
      const runnerInPreRoom = [...preRoomSockets].some(sid => {
        const s = io.sockets.sockets.get(sid);
        return s?.runnerId === runnerId;
      });

      if (runnerInPreRoom && !state.locked) {
        console.log('[requestRunner] runner is actually in pre-room, proceeding');
        if (state.globalTimer) { clearTimeout(state.globalTimer); state.globalTimer = null; }
        await lockAndProceed(io, chatId, state);
      }
      return;
    }

    state.user = true;
    state.userId = userId;
    state.specialInstructions = specialInstructions || null;
    state.attemptToken = attemptToken || null;
    socket.join(`pre-${chatId}`);

    const preRoomSockets = await io.in(`pre-${chatId}`).allSockets();
    const runnerInPreRoom = [...preRoomSockets].some(sid => {
      const s = io.sockets.sockets.get(sid);
      return s?.runnerId === runnerId;
    });

    console.log(`[requestRunner] user ${userId} in pre-room. runner present=${runnerInPreRoom} (state.runner=${state.runner})`);

    if (runnerInPreRoom) {
      if (state.globalTimer) { clearTimeout(state.globalTimer); state.globalTimer = null; }
      await lockAndProceed(io, chatId, state);
      return;
    }

    if (!state.globalTimer) {
      state.globalTimer = setTimeout(() => {
        const s = preRoomState.get(chatId);
        if (s && (!s.user || !s.runner)) {
          console.warn('[preRoom] timeout — both parties never arrived for chatId:', chatId);
          preRoomState.delete(chatId);
          io.to(`pre-${chatId}`).emit('preRoomTimeout', { chatId, message: 'Connection timed out.' });
          io.to(`user-${userId}`).emit('preRoomTimeout', { chatId, message: 'Connection timed out.' });
        }
      }, 60_000);
    }

    logSocketAudit('USER_REQUESTED_RUNNER', { runnerId, userId, chatId, serviceType });
  } catch (error) {
    console.error('[requestRunner] error:', error);
    socket.emit('chatError', {
      code: 'REQUEST_RUNNER_FAILED',
      message: 'Failed to connect to runner. Please try again.',
      chatId,
    });
  }
};

// ─── Lock both parties and proceed ───────────────────────────────────────────

const lockAndProceed = async (io, chatId, state) => {
  if (state.locked) {
    console.warn('[lockAndProceed] already locked for chatId:', chatId);
    return;
  }

  state.locked = true;

  if (state.globalTimer) {
    clearTimeout(state.globalTimer);
    state.globalTimer = null;
  }

  const { runnerId, userId } = state;
  await Promise.all([
    Runner.findByIdAndUpdate(runnerId, { isAvailable: false }),
    User.findByIdAndUpdate(userId, { isAvailable: false }),
  ]);
  await initializeChatAndProceed(io, chatId, state);
  logSocketAudit('CHAT_LOCKED', { runnerId, userId });
};

// ─── Chat initialization (pre-room → chat) ────────────────────────────────────
//
// Responsibilities:
//   1. Archive any previous session for this chatId
//   2. Reset the chat document with fresh runner profile messages
//   3. Emit proceedToChat to both parties
//   4. Reset socket join-state so handleUserJoinChat / handleRunnerJoinChat
//      will do a full re-join when the clients call joinChat
//
const initializeChatAndProceed = async (io, chatId, state) => {
  const { runnerId, userId, serviceType } = state;

  try {
    const [runnerData, userDoc, existingChat, lastOrder] = await Promise.all([
      Runner.findById(runnerId).lean(),
      User.findById(userId).lean(),
      Chat.findOne({ chatId }),
      Order.findOne({ chatId }).sort({ createdAt: -1 }).lean()
    ]);

    const specialInstructions = sanitizeSpecialInstructions(
      userDoc?.currentRequest?.specialInstructions || state.specialInstructions
    );

    const initialMessages = createInitialRunnerMessages(runnerData, serviceType, runnerId);
    const orderSessionId = `${Date.now()}-${runnerId}`;

    let chat;

    if (existingChat) {
      // 1. Archive in background
      const archivePromise = lastOrder?.orderId
        ? archiveCurrentSession(
          chatId,
          lastOrder.orderId,
          ['completed', 'task_completed'].includes(lastOrder.status) ? 'completed' : 'cancelled'
        ).catch(err => console.error('[archive] bg failed:', err.message))
        : Promise.resolve();

      // 2. Reset chat document (THIS MUST WAIT - chat needs fresh state)
      existingChat.messages = [...initialMessages];
      existingChat.specialInstructions = specialInstructions || null;
      existingChat.lastActivity = new Date();
      existingChat.serviceType = serviceType;
      existingChat.orderId = null;
      existingChat.taskId = null;
      existingChat.orderSessionId = orderSessionId;

      // 3. Save chat + cancel stale orders in parallel (both required before proceeding)
      await Promise.all([
        existingChat.save(),
        Order.updateMany(
          { chatId, status: { $nin: ['completed', 'cancelled', 'task_completed'] } },
          {
            $set: {
              status: 'cancelled',
              cancelledAt: new Date(),
              cancelReason: 'new_session_started',
            },
            $push: {
              statusHistory: {
                status: 'cancelled',
                timestamp: new Date(),
                triggeredBy: 'system',
                note: 'New session started',
              },
            },
          }
        ),
      ]);

      // 4. Reset socket state in background (doesn't need to block proceedToChat)
      const resetSocketState = async () => {
        for (const roomName of [chatId, `runner-${runnerId}`, `user-${userId}`]) {
          const room = io.sockets.adapter.rooms.get(roomName);
          if (room) {
            for (const socketId of room) {
              const s = io.sockets.sockets.get(socketId);
              if (s) {
                s.joinedChat = false;
                s.currentChatId = null;
              }
              socketMessageSnapshot.delete(socketId);
            }
          }
        }
      };
      resetSocketState().catch(err => console.error('[socketReset] bg failed:', err.message));
      archivePromise.then(() => console.log('[archive] bg complete:', chatId));

      io.to(`user-${userId}`).emit('chatReset', { chatId });
      chat = existingChat;

    } else {
      chat = await Chat.create({
        chatId,
        messages: initialMessages,
        orderSessions: [],
        userId,
        runnerId,
        serviceType,
        orderSessionId,
        createdBy: 'system',
        createdAt: new Date(),
        specialInstructions: specialInstructions || null,
      });
      console.log('[initializeChat] New chat created');
    }

    // User presence check (must wait - determines if we proceed)
    const userRoomSockets = await io.in(`user-${userId}`).allSockets();
    const runnerSocketId = [...(io.sockets.adapter.rooms.get(`pre-${chatId}`) || [])]
      .find(sid => {
        const s = io.sockets.sockets.get(sid);
        return s?.runnerId === runnerId;
      });
    const userStillPresent = userRoomSockets.size > 0;

    if (!userStillPresent) {
      console.warn('[initializeChat] user no longer present — notifying runner');
      io.to(`runner-${runnerId}`).emit('userLeftQueue', {
        chatId,
        message: 'User stopped waiting. They may retry.',
      });
      preRoomState.delete(chatId);
      return;
    }

    if (runnerSocketId) {
      const runnerSocket = io.sockets.sockets.get(runnerSocketId);
      if (runnerSocket) {
        runnerSocket.join(`runner-${runnerId}`);
        runnerSocket.join(chatId);
        console.log('[initializeChat] pre-joined runner socket to rooms:', runnerSocketId);
      }
    }

    const proceedPayload = {
      chatId, runnerId, userId, serviceType,
      chatReady: true,
      orderSessionId,
      initialMessages: chat.messages,
      specialInstructions: specialInstructions || null,
      attemptToken: state.attemptToken || null,
    };

    console.log('[initializeChat] pre-room sockets:',
      [...(io.sockets.adapter.rooms.get(`pre-${chatId}`) || [])]);
    console.log('[initializeChat] user room sockets:',
      [...(io.sockets.adapter.rooms.get(`user-${userId}`) || [])]);
    console.log('[initializeChat] runner room sockets:',
      [...(io.sockets.adapter.rooms.get(`runner-${runnerId}`) || [])]);

    io.to(`pre-${chatId}`).emit('proceedToChat', proceedPayload);
    io.to(`user-${userId}`).emit('proceedToChat', proceedPayload);
    io.to(`runner-${runnerId}`).emit('proceedToChat', proceedPayload);

    console.log('[initializeChat] proceedToChat emitted to all 3 rooms');

    preRoomState.delete(chatId);
    logSocketAudit('PROCEED_TO_CHATROOM', { runnerId, userId, serviceType });

  } catch (error) {
    console.error('[initializeChat] error:', error);
    preRoomState.delete(chatId);
    io.to(`user-${userId}`).emit('chatError', {
      code: 'CHAT_INIT_FAILED',
      message: 'Failed to prepare chat. Please try again.',
      chatId,
    });
    io.to(`runner-${runnerId}`).emit('chatError', {
      code: 'CHAT_INIT_FAILED',
      message: 'Failed to prepare chat session.',
      chatId,
    });
  }
};

// ─── User joins chat ──────────────────────────────────────────────────────────
//
// Server is the source of truth. Strategy:
//   1. Prevent concurrent joins for the same chatId
//   2. Always read fresh from DB
//   3. If there is already a paid active order → restore history, filter payment_request out
//   4. If there is an unpaid active order → ensure payment_request is present, emit
//   5. If no active order at all → call createOrder (which injects payment_request and broadcasts)
//
const handleUserJoinChat = async (socket, io, data) => {
  const { userId, runnerId, chatId } = data;

  // Already in this chat — skip re-join logic, just re-emit current state
  if (socket.joinedChat && socket.currentChatId === chatId) {
    const [chat, order] = await Promise.all([
      Chat.findOne({ chatId }).lean(),
      Order.findOne({ chatId, status: { $nin: ['cancelled', 'completed', 'task_completed'] } })
        .sort({ createdAt: -1 }).lean(),
    ]);
    if (chat) socket.emit('chatHistory', deduplicateMessages(chat.messages));
    if (order) socket.emit('orderCreated', { order: cleanForEmit(order) });
    return;
  }

  if (joiningChats.has(chatId)) {
    console.log('[userJoinChat] concurrent join blocked for:', chatId);
    setTimeout(async () => {
      const [existing, order] = await Promise.all([
        Chat.findOne({ chatId }).lean(),
        Order.findOne({ chatId, status: { $nin: ['cancelled', 'completed', 'task_completed'] } })
          .sort({ createdAt: -1 }).lean(),
      ]);
      if (existing) {
        const clean = await deduplicateAndPersist(chatId, existing.messages);
        socket.emit('chatHistory', clean);
      }
      // ← add this: if order exists by now, emit it; if not, retry once more
      if (order) {
        socket.emit('orderCreated', { order: cleanForEmit(order) });
      } else {
        // order creation may still be in flight — wait and retry once
        setTimeout(async () => {
          const retryOrder = await Order.findOne({
            chatId,
            status: { $nin: ['cancelled', 'completed', 'task_completed'] }
          }).sort({ createdAt: -1 }).lean();
          if (retryOrder) socket.emit('orderCreated', { order: cleanForEmit(retryOrder) });
        }, 1500);
      }
    }, 600);
    return;
  }

  joiningChats.add(chatId);

  try {
    // Always (re-)join these rooms so messages reach this socket
    socket.join(chatId);
    socket.join(`user-${userId}`);
    socket.currentChatId = chatId;
    socket.joinedChat = true;
    socket.userId = userId;
    socket.runnerId = runnerId;

    // ── Fresh read from DB ────────────────────────────────────────────────────
    const [chat, latestOrder] = await Promise.all([
      Chat.findOne({ chatId }),
      Order.findOne({ chatId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!chat) {
      console.log('[userJoinChat] no chat document yet — waiting for initializeChatAndProceed');
      socket.emit('chatHistory', []);
      io.to(`runner-${runnerId}`).emit('userJoinedChat', {
        userId, runnerId, chatId,
        userInRoom: true,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log('[userJoinChat] latestOrder:', latestOrder?.orderId,
      '| status:', latestOrder?.status,
      '| paymentStatus:', latestOrder?.paymentStatus);

    const isTerminal = !latestOrder || ['completed', 'cancelled', 'task_completed'].includes(latestOrder?.status);
    if (isTerminal) {
      socket.emit('chatReset', { chatId }); // ← tells runner to wipe stale Zustand order
    }

    const isPaid = latestOrder?.paymentStatus === 'paid';
    const isActiveUnpaid = latestOrder && !isPaid && !isTerminal;
    const isActivePaid = latestOrder && isPaid && !isTerminal;

    const notifyPartnerOfRead = () => {
      io.to(`runner-${runnerId}`).emit('messagesRead', { chatId, readBy: userId });
    };

    // ── CASE A: paid active order → restore history without payment_request ──
    if (isActivePaid) {
      console.log('[userJoinChat] CASE A — paid active order, restoring history');
      const cleanMessages = await deduplicateAndPersist(chatId, chat.messages);
      const filtered = cleanMessages.filter(
        m => m.type !== 'payment_request' && m.messageType !== 'payment_request'
      );
      filtered.forEach(m => snapshotMessage(socket.id, chatId, m.id));
      socket.emit('orderCreated', { order: cleanForEmit(latestOrder) });
      socket.emit('chatHistory', filtered);
      notifyPartnerOfRead();
      io.to(`runner-${runnerId}`).emit('userJoinedChat', {
        userId, runnerId, chatId, userInRoom: true, timestamp: new Date().toISOString(),
      });
      logSocketAudit('USER_JOINED_CHAT', { userId, runnerId, chatId, case: 'A' });
      return;
    }

    // ── CASE B: unpaid active order → ensure payment_request present ──────────
    if (isActiveUnpaid) {
      console.log('[userJoinChat] CASE B — unpaid active order');
      const alreadyHas = chat.messages.some(
        m => (m.type === 'payment_request' || m.messageType === 'payment_request')
          && m.paymentData?.orderId === latestOrder.orderId
      );

      let finalChat = chat;
      if (!alreadyHas) {
        finalChat = await Chat.findOneAndUpdate(
          { chatId },
          {
            $push: { messages: buildPaymentRequestMsg(latestOrder, chatId, userId, runnerId) },
            $set: { lastActivity: new Date() },
          },
          { new: true }
        );
      }

      const cleanMessages = await deduplicateAndPersist(chatId, finalChat.messages);
      cleanMessages.forEach(m => snapshotMessage(socket.id, chatId, m.id));

      socket.emit('orderCreated', {
        order: {
          chatId: latestOrder.chatId,
          orderId: latestOrder.orderId,
          itemBudget: latestOrder.itemBudget,
          deliveryFee: latestOrder.deliveryFee,
          totalAmount: latestOrder.totalAmount,
          taskType: latestOrder.taskType,
          serviceType: latestOrder.serviceType,
          status: latestOrder.status,
          paymentStatus: latestOrder.paymentStatus,
        },
        isNewOrder: false,
      });
      socket.emit('chatHistory', cleanMessages);
      notifyPartnerOfRead();
      io.to(`runner-${runnerId}`).emit('userJoinedChat', {
        userId, runnerId, chatId, userInRoom: true, timestamp: new Date().toISOString(),
      });
      logSocketAudit('USER_JOINED_CHAT', { userId, runnerId, chatId, case: 'B' });
      return;
    }

    // ── CASE C: no active order (terminal or none) → create fresh order ───────
    console.log('[userJoinChat] CASE C — creating new order');

    const freshChat = await Chat.findOne({ chatId }).lean();
    const isResetChat = freshChat?.messages?.length <= 2 &&
      freshChat?.messages?.some(m => m.type === 'system' && m.text?.includes('joined the chat'));

    if (!isResetChat) {
      console.log('[userJoinChat] CASE C blocked — chat not reset, skipping order creation');
      const cleanMessages = await deduplicateAndPersist(chatId, freshChat.messages);
      cleanMessages.forEach(m => snapshotMessage(socket.id, chatId, m.id));
      socket.emit('chatHistory', cleanMessages);
      notifyPartnerOfRead();
      io.to(`runner-${runnerId}`).emit('userJoinedChat', {
        userId, runnerId, chatId, userInRoom: true, timestamp: new Date().toISOString(),
      });
      return;
    }

    // Race guard: another concurrent join may have already created one
    const raceGuard = await Order.findOne({
      chatId,
      status: { $nin: ['cancelled', 'completed', 'task_completed'] },
    }).sort({ createdAt: -1 }).lean();

    if (raceGuard) {
      console.log('[userJoinChat] race guard — active order exists:', raceGuard.orderId);
      const existingChat = await Chat.findOne({ chatId }).lean();
      const cleanMessages = await deduplicateAndPersist(chatId, existingChat.messages);
      cleanMessages.forEach(m => snapshotMessage(socket.id, chatId, m.id));
      socket.emit('orderCreated', { order: cleanForEmit(raceGuard) });
      socket.emit('chatHistory', cleanMessages);
      io.to(`runner-${runnerId}`).emit('userJoinedChat', {
        userId, runnerId, chatId, userInRoom: true, timestamp: new Date().toISOString(),
      });
      return;
    }

    // Derive serviceType from DB sources
    const userDoc = await User.findById(userId).lean();
    const resolvedServiceType = userDoc?.currentRequest?.serviceType || chat.serviceType;

    console.log('[createOrder] resolvedServiceType:', resolvedServiceType, 'from userDoc:', userDoc?.currentRequest?.serviceType);

    // Ensure chat.serviceType is current
    if (resolvedServiceType && resolvedServiceType !== chat.serviceType) {
      await Chat.findOneAndUpdate({ chatId }, { $set: { serviceType: resolvedServiceType } });
    }

    // createOrder handles: order creation, payment_request injection, and broadcast
    const { cleanMessages } = await createOrder(io, {
      chatId, userId, runnerId, serviceType: resolvedServiceType,
    });

    cleanMessages.forEach(m => snapshotMessage(socket.id, chatId, m.id));

    io.to(`runner-${runnerId}`).emit('userJoinedChat', {
      userId, runnerId, chatId, userInRoom: true, timestamp: new Date().toISOString(),
    });

    logSocketAudit('USER_JOINED_CHAT', { userId, runnerId, chatId, case: 'C' });
  } catch (orderErr) {
    if (orderErr.statusCode === 400) {
      // chatError already emitted inside createOrder — just log and bail
      console.warn('[userJoinChat] createOrder 400:', orderErr.message);
      return;
    }
    throw orderErr;

    console.error('[userJoinChat] error:', orderErr);

    console.error('[userJoinChat] createOrder failed:', orderErr.message);
    socket.emit('chatError', {
      code: 'ORDER_CREATE_FAILED',
      message: 'Failed to create your order. Please try again.',
      chatId,
    });
    io.to(`runner-${runnerId}`).emit('chatError', {
      code: 'ORDER_CREATE_FAILED',
      message: 'Failed to create order for this session.',
      chatId,
    });

  } finally {
    joiningChats.delete(chatId);
  }
};

// ─── Runner joins chat ────────────────────────────────────────────────────────
//
// Server is the source of truth.
// Always read fresh from DB. Filter payment_request if order is paid.
//
const handleRunnerJoinChat = async (socket, io, data) => {
  console.log('[handleRunnerJoinChat] RECEIVED from socket:', socket.id, '| data:', JSON.stringify(data));
  const { runnerId, userId, chatId } = data;

  // Always (re-)join these rooms
  socket.join(chatId);
  socket.join(`runner-${runnerId}`);
  socket.currentChatId = chatId;
  socket.joinedChat = true;
  socket.runnerId = runnerId;
  socket.userId = userId;

  // ── Fresh read from DB ──────────────────────────────────────────────────────
  const [chat, order] = await Promise.all([
    Chat.findOne({ chatId }).lean(),
    Order.findOne({
      chatId,
      status: { $nin: ['cancelled', 'completed', 'task_completed'] }
    }).sort({ createdAt: -1 }).lean(),
  ]);

  if (!chat) {
    socket.emit('chatHistory', []);
    return;
  }

  const cleanMessages = await deduplicateAndPersist(chatId, chat.messages);
  cleanMessages.forEach(m => snapshotMessage(socket.id, chatId, m.id));

  const isPaid = order?.paymentStatus === 'paid';
  const filteredMessages = isPaid
    ? cleanMessages.filter(m => m.type !== 'payment_request' && m.messageType !== 'payment_request')
    : cleanMessages;

  if (order) {
    socket.emit('chatHistory', filteredMessages);
    io.to(`user-${userId}`).emit('messagesRead', { chatId, readBy: runnerId });
    socket.emit('orderCreated', { order: { ...cleanForEmit(order), chatId } });
  } else {
    // No active order — createOrder will emit chatHistory, just send current profile messages
    socket.emit('chatHistory', filteredMessages);
  }

  if (chat.specialInstructions) {
    console.log('[runnerJoinChat] emitting specialInstructions:', JSON.stringify(chat.specialInstructions, null, 2));
    socket.emit('specialInstructions', { chatId, specialInstructions: chat.specialInstructions });
  }

  if (order) {
    socket.emit('orderCreated', { order: { ...cleanForEmit(order), chatId } });
  }

  io.to(`user-${userId}`).emit('runnerJoinedChat', {
    userId, runnerId, chatId,
    runnerInRoom: true,
    timestamp: new Date().toISOString(),
  });

  logSocketAudit('RUNNER_JOINED_CHAT', { runnerId, chatId, userId });
};


const handleStartTrackRunner = (io, data) => {
  if (!data?.chatId || !data?.runnerId) {
    console.error("Missing chatId or runnerId in startTrackRunner payload");
    return;
  }
  const { chatId, runnerId, userId } = data;
  io.to(chatId).emit("receiveTrackRunner", cleanForEmit({
    chatId, runnerId, userId,
    status: "on_way_to_delivery",
    trackingData: { lat: null, lng: null, eta: null },
    timestamp: new Date().toISOString(),
  }));
  logSocketAudit('TRACK_RUNNER', { chatId, runnerId, userId });
};


const handleRunnerReconnect = async (socket, io) => {
  if (!socket.runnerId) {
    console.log('[handleRunnerReconnect] No runnerId on socket, skipping');
    return;
  }

  const runnerId = socket.runnerId;
  console.log(`[handleRunnerReconnect] Runner ${runnerId} reconnecting`);

  // Find any active pre-room state for this runner
  let foundChatId = null;
  let foundState = null;

  for (const [chatId, state] of preRoomState.entries()) {
    if (state.runnerId === runnerId && !state.locked) {
      foundChatId = chatId;
      foundState = state;
      break;
    }
  }

  if (!foundChatId || !foundState) {
    console.log(`[handleRunnerReconnect] No active pre-room found for runner ${runnerId}`);
    return;
  }

  // Rejoin pre-room
  socket.join(`pre-${foundChatId}`);
  console.log(`[handleRunnerReconnect] Runner ${runnerId} re-joined pre-${foundChatId}`);

  // If user is already waiting, proceed immediately
  if (foundState.user) {
    console.log(`[handleRunnerReconnect] User already waiting, proceeding to lock`);
    if (foundState.globalTimer) {
      clearTimeout(foundState.globalTimer);
      foundState.globalTimer = null;
    }
    await lockAndProceed(io, foundChatId, foundState);
  } else {
    // Re-emit enterPreRoom to the user so they know runner is back
    const payload = {
      chatId: foundChatId,
      runnerId: runnerId,
      userId: foundState.userId,
      serviceType: foundState.serviceType,
      message: 'Runner reconnected! Preparing chat...',
    };
    io.to(`user-${foundState.userId}`).emit('enterPreRoom', payload);
    console.log(`[handleRunnerReconnect] Re-emitted enterPreRoom to user ${foundState.userId}`);
  }
};

const handleRejoinChat = async (socket, io, { chatId, userId, runnerId, userType }) => {
  if (!chatId) return;

  console.log('[rejoinChat]', userType, 'rejoining room:', chatId);

  socket.join(chatId);
  socket.currentChatId = chatId;

  if (userType === 'runner' && runnerId) {
    socket.join(`runner-${runnerId}`);
    socket.runnerId = runnerId;
    socket.joinedChat = true;
  } else if (userType === 'user' && userId) {
    socket.join(`user-${userId}`);
    socket.userId = userId;
    socket.joinedChat = true;
  }

  const snapshot = socketMessageSnapshot.get(socket.id);

  // Always fresh from DB
  const [chat, latestOrder] = await Promise.all([
    Chat.findOne({ chatId }).select('messages specialInstructions').lean(),
    Order.findOne({ chatId }).sort({ createdAt: -1 }).select('paymentStatus status').lean(),
  ]);

  if (!chat?.messages?.length) {
    console.log('[rejoinChat] no chat found');
    return;
  }

  const isPaid = latestOrder?.paymentStatus === 'paid';

  let cleanMessages = deduplicateMessages(chat.messages);
  if (isPaid) {
    cleanMessages = cleanMessages.filter(
      m => m.type !== 'payment_request' && m.messageType !== 'payment_request'
    );
  }

  if (!snapshot || snapshot.chatId !== chatId) {
    const isFreshChat = userType === 'user' && cleanMessages.length <= 2 &&
      cleanMessages.some(m => m.type === 'system' && m.text?.includes('joined the chat'));

    if (isFreshChat) {
      console.log('[rejoinChat] fresh chat — skipping history, userJoinChat will handle it');
      return;
    }


    console.log('[rejoinChat] no snapshot, sending full chatHistory');
    cleanMessages.forEach(m => snapshotMessage(socket.id, chatId, m.id));
    socket.emit('chatHistory', cleanMessages);
  } else {
    const missed = cleanMessages.filter(m => m.id && !snapshot.messageIds.has(m.id));
    if (missed.length === 0) {
      console.log('[rejoinChat] client is up to date, no missed messages');
    } else {
      console.log('[rejoinChat] sending', missed.length, 'missed messages');
      missed.forEach(m => snapshotMessage(socket.id, chatId, m.id));
      socket.emit('missedMessages', missed);
    }
  }

  console.log('[rejoinChat] room size:', io.sockets.adapter.rooms.get(chatId)?.size);
};

// ─── Fetch archived order session ─────────────────────────────────────────────

const handleGetOrderSession = async (socket, { chatId, orderId }) => {
  try {
    const chat = await Chat.findOne({ chatId }).lean();
    if (!chat) return socket.emit('orderSessionHistory', { orderId, messages: [] });

    const session = chat.orderSessions?.find(s => s.orderId === orderId);
    socket.emit('orderSessionHistory', {
      orderId,
      chatId,
      messages: session?.messages || [],
      status: session?.status || null,
      completedAt: session?.completedAt || null,
    });
  } catch (err) {
    console.error('handleGetOrderSession error:', err);
    socket.emit('orderSessionHistory', { orderId, messages: [] });
  }
};

// ─── Get archived messages for a completed order session ──────────────────────

const handleGetArchivedMessages = async (socket, { chatId, userId, runnerId, orderId }) => {
  try {
    const chat = await Chat.findOne({ chatId }).lean();
    if (!chat) return socket.emit('archivedMessages', { chatId, messages: [] });

    let messages = [];
    let status = null;
    let completedAt = null;

    if (orderId) {
      const session = chat.orderSessions?.find(s => s.orderId === orderId);
      if (session) {
        messages = session.messages;
        status = session.status;
        completedAt = session.completedAt;
      }
    } else {
      const lastSession = [...(chat.orderSessions || [])]
        .reverse()
        .find(s => s.status === 'completed' || s.status === 'task_completed');
      if (lastSession) {
        messages = lastSession.messages;
        status = lastSession.status;
        completedAt = lastSession.completedAt;
      }
    }

    socket.emit('archivedMessages', { chatId, messages, status, completedAt, orderId: orderId || null });
    logSocketAudit('GET_ARCHIVED_MESSAGES', { chatId, userId, runnerId, orderId });
  } catch (err) {
    console.error('handleGetArchivedMessages error:', err);
    socket.emit('archivedMessages', { chatId, messages: [] });
  }
};

const requestSessionRefresh = async (socket, io, data) => {
  if (!data?.chatId) return;
  const { chatId, orderId, userId, userType, runnerId } = data;

  // Rejoin rooms first — do this regardless of order state
  socket.join(chatId);
  if (userType === 'user') socket.join(`user-${userId}`);
  else if (userType === 'runner') socket.join(`runner-${runnerId}`);

  const [latestOrder, chat] = await Promise.all([
    Order.findOne({ chatId }).sort({ createdAt: -1 }).lean(),
    Chat.findOne({ chatId }).lean(),
  ]);

  // Always emit sessionRefreshOk — client handles the rejoin
  // If order changed, include the new orderId so client can update
  socket.emit('sessionRefreshOk', {
    chatId,
    orderId: latestOrder?.orderId || orderId,
    orderChanged: latestOrder?.orderId !== orderId,
  });
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

const handleDisconnect = async (socket, io) => {
  if (socket.serviceType && runnersByService[socket.serviceType]) {
    runnersByService[socket.serviceType].delete(socket.id);
  }
  socketMessageSnapshot.delete(socket.id);

  const isRunner = !!socket.runnerId && !socket.userId;
  const offlineId = isRunner ? socket.runnerId : socket.userId;

  if (!offlineId) return;

  const Model = isRunner ? Runner : User;
  const offlinePerson = await Model.findById(offlineId).select('firstName lastName').lean();
  const name = offlinePerson
    ? `${offlinePerson.firstName} ${offlinePerson.lastName || ''}`.trim()
    : isRunner ? 'Your runner' : 'The user';

  const chatId = socket.currentChatId;
  const partnerId = isRunner ? socket.userId : socket.runnerId;
  const partnerType = isRunner ? 'user' : 'runner';

  if (!partnerId || !chatId) return;
};

module.exports = {
  runnersByService,
  handleJoinRunnerRoom,
  handleAcceptRunnerRequest,
  handleStartTrackRunner,
  handleRequestRunner,
  handleUserJoinChat,
  handleRunnerJoinChat,
  handleDisconnect,
  handleRunnerReconnect,
  handleRejoinChat,
  archiveCurrentSession,
  handleGetOrderSession,
  handleGetArchivedMessages,
  createOrder,
  requestSessionRefresh,

  handleGetSpecialInstructions,
  handleDeleteMessage,
  handleSendMessage,
};