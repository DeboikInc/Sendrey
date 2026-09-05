// socket/beaconHandlers.js
const logger = require('../utils/logger');

const activeBeacons = new Map();       // user -> runner, key: chatId
const activeRunnerBeacons = new Map(); // runner -> user, key: chatId

const EXPIRY_MS = 90000;

/** User requests to connect - sends beacon to runner */
const handleRequestConnect = async (socket, io, data) => {
    const { runnerId, userId, chatId, userName } = data;
    if (!runnerId || !userId || !chatId) {
        socket.emit('beaconError', { message: 'Missing required fields' });
        return;
    }

    activeBeacons.set(chatId, { runnerId, userId, userName: userName || 'Someone', timestamp: Date.now() });

    io.to(`runner-${runnerId}`).emit('connectionBeacon', {
        userId, chatId, userName: userName || 'Someone', timestamp: Date.now()
    });

    logger.info(`[Beacon] User ${userId} requesting connection to runner ${runnerId}`);
};

/** User cancels connection request - removes beacon */
const handleCancelConnect = async (socket, io, data) => {
    const { runnerId, userId, chatId } = data;
    if (!chatId) return;

    if (activeBeacons.delete(chatId) && runnerId) {
        io.to(`runner-${runnerId}`).emit('connectionBeaconCancelled', { userId, chatId });
        logger.info(`[Beacon] User ${userId} cancelled connection to runner ${runnerId}`);
    }
};

/** Runner requests to connect (e.g. hitting Accept) - sends beacon to user */
const handleRunnerRequestConnect = async (socket, io, data) => {
    const { runnerId, userId, chatId, runnerName } = data;
    if (!runnerId || !userId || !chatId) {
        socket.emit('beaconError', { message: 'Missing required fields' });
        return;
    }

    activeRunnerBeacons.set(chatId, { runnerId, userId, runnerName: runnerName || 'Runner', timestamp: Date.now() });

    io.to(`user-${userId}`).emit('runnerConnectionBeacon', {
        runnerId, chatId, runnerName: runnerName || 'Runner', timestamp: Date.now()
    });

    logger.info(`[Beacon] Runner ${runnerId} requesting connection to user ${userId}`);
};

/** Runner cancels connection request - removes beacon */
const handleRunnerCancelConnect = async (socket, io, data) => {
    const { runnerId, userId, chatId } = data;
    if (!chatId) return;

    if (activeRunnerBeacons.delete(chatId) && userId) {
        io.to(`user-${userId}`).emit('runnerConnectionBeaconCancelled', { runnerId, chatId });
        logger.info(`[Beacon] Runner ${runnerId} cancelled connection to user ${userId}`);
    }
};

/** Clear any active beacons tied to a chatId and notify both sides */
const clearBeaconsForChat = (io, chatId, runnerId, userId) => {
    const hadUserBeacon = activeBeacons.delete(chatId);
    const hadRunnerBeacon = activeRunnerBeacons.delete(chatId);

    if (hadUserBeacon && runnerId) {
        io.to(`runner-${runnerId}`).emit('connectionBeaconCancelled', { userId, chatId });
    }
    if (hadRunnerBeacon && userId) {
        io.to(`user-${userId}`).emit('runnerConnectionBeaconCancelled', { runnerId, chatId });
    }
};

const cleanupExpiredBeacons = () => {
    const now = Date.now();
    for (const [chatId, beacon] of activeBeacons) {
        if (now - beacon.timestamp > EXPIRY_MS) activeBeacons.delete(chatId);
    }
    for (const [chatId, beacon] of activeRunnerBeacons) {
        if (now - beacon.timestamp > EXPIRY_MS) activeRunnerBeacons.delete(chatId);
    }
};

setInterval(cleanupExpiredBeacons, 30000);

module.exports = {
    handleRequestConnect,
    handleCancelConnect,
    handleRunnerRequestConnect,
    handleRunnerCancelConnect,
    activeBeacons,
    activeRunnerBeacons,
    clearBeaconsForChat,
};