const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.get('/', verifyToken, requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE']), auditController.getAuditLogs);

module.exports = router;
