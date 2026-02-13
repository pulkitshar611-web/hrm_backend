const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');
const authController = require('../controllers/auth.controller');

router.post('/login', auditLog('LOGIN', 'AUTH'), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', auditLog('LOGOUT', 'AUTH'), authController.logout);

router.use(verifyToken);
router.get('/sessions', authController.getSessions);
router.post('/terminate-sessions', auditLog('TERMINATE_SESSIONS', 'AUTH'), authController.terminateSessions);

module.exports = router;
