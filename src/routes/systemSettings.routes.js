const express = require('express');
const router = express.Router();
const {
    getSystemSettings,
    updateSystemSettings
} = require('../controllers/systemSettings.controller');

router.get('/', getSystemSettings);
router.put('/', updateSystemSettings);

module.exports = router;
