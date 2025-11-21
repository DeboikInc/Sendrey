const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const runnerRoutes = require('./runnerRoutes');

// Use route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/runners', runnerRoutes);

// Export the router
module.exports = router;