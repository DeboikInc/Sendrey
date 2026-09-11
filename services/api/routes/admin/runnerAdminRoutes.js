const express = require('express');
const router = express.Router();
const runnerController = require('../../controllers/runnerController');

router.get('/', runnerController.getRunners);
router.get('/search', runnerController.searchRunners);
router.get('/stats', runnerController.getRunnerStats);
router.patch('/:runnerId/status', runnerController.updateRunnerStatus);
router.patch('/restore/:runnerId', runnerController.restoreRunner);
router.delete('/:runnerId', runnerController.deleteRunner);
router.patch('/:runnerId/reset-strikes', runnerController.resetStrikes);
module.exports = router;

