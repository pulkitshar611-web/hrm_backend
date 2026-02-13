const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.get('/admin-stats', verifyToken, requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE']), dashboardController.getAdminStats);

module.exports = router;
