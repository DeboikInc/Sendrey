let cachedIO = null;

function getSocketIO() {
  if (cachedIO) return cachedIO;

  try {
    const socketModule = require('../socket');
    if (socketModule && typeof socketModule.getIO === 'function') {
      const io = socketModule.getIO();
      if (io) cachedIO = io; // only cache once actually initialized
      return io;
    }
    console.warn('[socketAccessor] socketModule.getIO is not a function yet');
    return null;
  } catch (err) {
    console.warn('[socketAccessor] Socket module not ready yet:', err.message);
    return null;
  }
}

module.exports = { getSocketIO };