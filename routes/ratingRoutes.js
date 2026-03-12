// ratingRoutes
const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const {authenticate, } = require('../middleware/auth');

router.use(authenticate)
router.post('/submit', ratingController.submitRating);
router.get('/runner/:runnerId', ratingController.getRunnerRatings);
router.get('/can-rate/:orderId', ratingController.canRateOrder);

module.exports = router;