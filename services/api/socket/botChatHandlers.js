const chatService = require('../services/chatService');
const logger = require('../utils/logger');

const handleGetBotChatHistory = async (socket, data, callback) => {
    const { runnerId } = data || {};
    if (!runnerId) {
        if (typeof callback === 'function') callback([]);
        return;
    }
    try {
        const messages = await chatService.getBotChatHistory(runnerId);
        if (typeof callback === 'function') callback(messages || []);
    } catch (err) {
        logger.error('[getBotChatHistory] failed:', err);
        if (typeof callback === 'function') callback([]);
    }
};

const handleSaveBotChatHistory = async (socket, data) => {
    const { runnerId, messages } = data || {};
    if (!runnerId || !Array.isArray(messages)) return;
    try {
        await chatService.saveBotChatHistory(runnerId, messages);
    } catch (err) {
        logger.error('[saveBotChatHistory] failed:', err);
    }
};

module.exports = { handleGetBotChatHistory, handleSaveBotChatHistory };