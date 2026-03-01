const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authenticate, authorize } = require('../middleware/auth');

// GET /orders/runner/:runnerId?page=1&limit=10
router.get('/runner/:runnerId', authenticate, authorize(['runner']), async (req, res) => {
    try {
        const { runnerId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find({ runnerId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('orderId serviceType status paymentStatus totalAmount createdAt cancelledAt completedAt')
                .lean(),
            Order.countDocuments({ runnerId })
        ]);

        res.json({
            orders,
            page,
            hasMore: skip + orders.length < total,
            total,
        });

    } catch (error) {
        console.error('fetchRunnerOrders error:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

module.exports = router;