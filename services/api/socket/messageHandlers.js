const { Chat } = require('../models/Chat');
const { logMetric } = require('../utils/metricsLogger');
const { logSocketAudit } = require('../utils/socketAudit');
const chatService = require('../services/chatService');

// ─── In-memory state ──────────────────────────────────────────────────────────

const socketMessageSnapshot = new Map();
const pendingWrites = new Map();
const chatSequences = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getNextSeq = (chatId) => {
    const seq = (chatSequences.get(chatId) || 0) + 1;
    chatSequences.set(chatId, seq);
    return seq;
};

const stripForTransport = (msg) => {
    if (!msg) return msg;
    const stripped = { ...msg };
    if (stripped.file && stripped.file.length > 1000) delete stripped.file;
    if (stripped.receiptBase64) delete stripped.receiptBase64;
    if (stripped.photoBase64) delete stripped.photoBase64;
    return stripped;
};

const cleanForEmit = (data) => {
    if (data && typeof data === 'object') {
        if (data.toObject && typeof data.toObject === 'function') return stripForTransport(data.toObject());
        if (Array.isArray(data)) return data.map(cleanForEmit);
        const result = {};
        for (const key in data) result[key] = cleanForEmit(data[key]);
        return stripForTransport(result);
    }
    return data;
};

const deduplicateMessages = (messages) => {
    const seen = new Set();
    return messages.filter(m => {
        if (!m.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
    });
};

const deduplicateAndPersist = async (chatId, messages) => {
    const deduped = deduplicateMessages(messages);
    if (deduped.length !== messages.length) {
        await Chat.findOneAndUpdate({ chatId }, { $set: { messages: deduped } });
    }
    return deduped;
};

const snapshotMessage = (socketId, chatId, messageId) => {
    if (!messageId) return;
    if (!socketMessageSnapshot.has(socketId)) {
        socketMessageSnapshot.set(socketId, { chatId, messageIds: new Set() });
    }
    socketMessageSnapshot.get(socketId).messageIds.add(messageId);
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

const handleSendMessage = async (socket, io, { chatId, message, runnerId     }) => {
    const startTime = Date.now();
    try {
        // Stamp sequence number server-side — client seq is untrusted
        const seq = getNextSeq(chatId);
        const stampedMessage = { ...message, seq, serverTimestamp: Date.now() };

        socket.to(chatId).emit('message', cleanForEmit(stampedMessage));

        const room = io.sockets.adapter.rooms.get(chatId);
        const partnerPresent = room && room.size > 1;

        // Echo back WITH seq so client can confirm and order
        socket.emit('messageEcho', {
            id: message.id,
            tempId: message.tempId,
            seq,
            serverTimestamp: stampedMessage.serverTimestamp,
            status: partnerPresent ? 'delivered' : 'sent',
        });

        if (message?.isPresenceMessage) return;

        const isCritical =
            message.type === 'system' ||
            message.messageType === 'system' ||
            message.type === 'payment_request' ||
            message.type === 'task_completed' ||
            message.type === 'delivery_confirmation_request';

        if (isCritical) {
            await Chat.findOneAndUpdate(
                { chatId },
                { $push: { messages: stampedMessage } },
                { upsert: true }
            );
            if (room) {
                for (const socketId of room) snapshotMessage(socketId, chatId, message.id);
            }
            return;
        }

        if (!pendingWrites.has(chatId)) {
            pendingWrites.set(chatId, { messages: [], timer: null });
        }

        const pending = pendingWrites.get(chatId);
        pending.messages.push(stampedMessage);

        if (pending.timer) clearTimeout(pending.timer);
        pending.timer = setTimeout(async () => {
            const toWrite = pending.messages.splice(0);
            pendingWrites.delete(chatId);
            try {
                const updatedChat = await Chat.findOneAndUpdate(
                    { chatId },
                    { $push: { messages: { $each: toWrite } } },
                    { upsert: true }
                );

                await chatService.saveChatHistory(chatId, updatedChat.messages);
            } catch (err) {
                console.error('[sendMessage] batch write failed:', err.message);
            }
        }, 500);

        if (room) {
            for (const socketId of room) snapshotMessage(socketId, chatId, message.id);
        }

        await logMetric({ type: 'message', status: 'success', latency: Date.now() - startTime, chatId });
    } catch (error) {
        console.error('Error sending message:', error);
        // Emit failure so client can retry
        socket.emit('messageEcho', {
            id: message.id,
            tempId: message.tempId,
            status: 'failed',
        });
    }
};

const handleDeleteMessage = async (socket, io, { chatId, messageId, userId, deleteForEveryone = true }) => {
    try {
        const chat = await Chat.findOne({ chatId });
        if (!chat) return;

        if (deleteForEveryone) {
            const idx = chat.messages.findIndex(m => m.id === messageId);
            if (idx !== -1) {
                chat.messages[idx] = {
                    ...chat.messages[idx],
                    deleted: true,
                    text: 'This message was deleted',
                    type: 'deleted',
                    fileUrl: null,
                    fileName: null,
                    createdAt: new Date(),
                };
                await chat.save();
                io.to(chatId).emit('messageDeleted', { messageId, deletedBy: userId, deleteForEveryone: true });
            }
        } else {
            socket.emit('messageDeletedForMe', { messageId, chatId });
        }

        logSocketAudit('MESSAGE_DELETED', { messageId, deletedBy: userId, chatId });
    } catch (error) {
        console.error('Error deleting message:', error);
    }
};

const handleGetSpecialInstructions = async (socket, { chatId }) => {
    try {
        const chat = await Chat.findOne({ chatId }).lean();
        socket.emit('specialInstructions', { chatId, specialInstructions: chat?.specialInstructions || null });
    } catch (error) {
        console.error('Error fetching special instructions:', error);
    }
};

const flushPendingWrites = async () => {
    const flushPromises = [];
    for (const [chatId, pending] of pendingWrites.entries()) {
        if (pending.timer) clearTimeout(pending.timer);
        if (pending.messages.length) {
            flushPromises.push(
                Chat.findOneAndUpdate(
                    { chatId },
                    { $push: { messages: { $each: pending.messages } } },
                    { upsert: true }
                ).catch(err => console.error('[flush] failed for', chatId, err.message))
            );
        }
    }
    await Promise.all(flushPromises);
    return flushPromises.length;
};

const handleGetLastSeq = async (socket, { chatId }) => {
    const chat = await Chat.findOne({ chatId })
        .select('messages')
        .lean();
    
    const lastMsg = chat?.messages?.findLast?.(m => m.seq != null);
    socket.emit('lastSeq', { chatId, seq: lastMsg?.seq || 0 });
};

const handleGetMissedMessages = async (socket, { chatId, fromSeq }) => {
    const chat = await Chat.findOne({ chatId }).select('messages').lean();
    if (!chat) return;

    const missed = chat.messages.filter(m => m.seq != null && m.seq > fromSeq);
    
    if (missed.length > 0) {
        socket.emit('missedMessages', { chatId, messages: missed });
    }
};

const stampMessage = (chatId, message) => {
    const seq = getNextSeq(chatId);
    return { ...message, seq, serverTimestamp: Date.now() };
};

module.exports = {
    // state
    socketMessageSnapshot,
    pendingWrites,
    // helpers
    stripForTransport,
    cleanForEmit,
    deduplicateMessages,
    deduplicateAndPersist,
    snapshotMessage,
    // handlers
    handleSendMessage,
    handleDeleteMessage,
    handleGetSpecialInstructions,
    flushPendingWrites,
    handleGetLastSeq,
    handleGetMissedMessages,
    stampMessage
};