const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Runner = require('../models/Runner');

router.post('/accept', authenticate, async (req, res) => {
  try {
    if (req.tokenExpired) {
      logger.info(`Terms accepted with expired token for user ${req.user._id}`);
      // Still allow the request since they're authenticated via grace period
    }

    const { version, userType, whatsappOptIn } = req.body;
    const userId = req.user._id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const Model = userType === 'runner' ? Runner : User;

    const update = {
      termsAccepted: {
        version,
        acceptedAt: new Date(),
        ipAddress
      }
    };

    if (typeof whatsappOptIn === 'boolean') {
      update.whatsappOptIn = whatsappOptIn;
      update.whatsappOptInSource = 'terms_modal';
      update.whatsappOptInTimestamp = whatsappOptIn ? new Date() : undefined;
    }

    await Model.findByIdAndUpdate(userId, update);

    res.json({ success: true, message: 'Terms accepted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/check', authenticate, async (req, res) => {
  try {
    const { userType } = req.query;
    const userId = req.user._id;

    const Model = userType === 'runner' ? Runner : User;
    const user = await Model.findById(userId).select('termsAccepted whatsappOptIn');

    res.json({
      success: true,
      data: {
        hasAccepted: !!user?.termsAccepted?.version,
        version: user?.termsAccepted?.version,
        acceptedAt: user?.termsAccepted?.acceptedAt,
        whatsappOptIn: user?.whatsappOptIn ?? false
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;