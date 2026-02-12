const express = require('express');
const router = express.Router();
const {
    calculateRedundancy,
    createRedundancy,
    getRedundancies,
    getRedundancy,
    updateRedundancyStatus,
    deleteRedundancy
} = require('../controllers/redundancy.controller');

router.post('/calculate', calculateRedundancy);
router.get('/', getRedundancies);
router.get('/:id', getRedundancy);
router.post('/', createRedundancy);
router.put('/:id/status', updateRedundancyStatus);
router.delete('/:id', deleteRedundancy);

module.exports = router;
