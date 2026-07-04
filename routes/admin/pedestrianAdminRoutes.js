// used by admin to get and update distance config for pedestrian runners live data 
const express = require('express');
const router = express.Router();
const distanceConfigController = require('../../controllers/distanceConfigController');

router.get('/get-pedestrian-config', distanceConfigController.getPedestrianConfig);
router.put('/update-pedestrian-config', distanceConfigController.updatePedestrianConfig);

module.exports = router;