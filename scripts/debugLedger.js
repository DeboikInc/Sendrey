require('dotenv').config();
const mongoose = require('mongoose');
const LedgerEntry = require('../models/LedgerEntry');

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const result = await LedgerEntry.deleteMany({
    userModel: 'User',
    type: 'escrow_release',
    description: { $regex: /BACKFILL/ },
  });
  console.log('Deleted:', result.deletedCount);
  process.exit();
});