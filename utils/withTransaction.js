// utils/withTransaction.js

const mongoose = require('mongoose');

const withTransaction = async (fn) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

  try {
    const result = await fn(session);
    await session.commitTransaction();
    committed = true;
    return result;
  } catch (error) {
    if (!committed) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Failed to abort transaction:', abortError.message);
      }
    }
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = { withTransaction };