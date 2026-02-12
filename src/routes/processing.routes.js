const express = require('express');
const router = express.Router();
const {
    getProcessingStatus,
    startProcess,
    updateProcessProgress,
    getProcessingLogs,
    getProcessingLog,
    cleanupOldLogs,
    getProcessingStatistics
} = require('../controllers/processing.controller');

router.get('/status', getProcessingStatus);
router.get('/logs', getProcessingLogs);
router.get('/statistics', getProcessingStatistics);
router.get('/:id', getProcessingLog);
router.post('/start', startProcess);
router.put('/:id', updateProcessProgress);
router.delete('/cleanup', cleanupOldLogs);

module.exports = router;
