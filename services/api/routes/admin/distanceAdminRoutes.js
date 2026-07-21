const express = require('express');
const router = express.Router();
const distanceConfigController = require('../../controllers/distanceConfigController');

router.get('/get-matching-config', distanceConfigController.getDistanceCapsConfig);
router.put('/put-matching-config', distanceConfigController.updateDistanceCapsConfig);

router.get('/get-pedestrian-config', distanceConfigController.getPedestrianConfig);
router.put('/update-pedestrian-config', distanceConfigController.updatePedestrianConfig);

module.exports = router;