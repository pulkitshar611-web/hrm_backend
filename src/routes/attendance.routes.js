const express = require('express');
const router = express.Router();
const { getAttendance, createAttendance, updateAttendance, deleteAttendance, getLiveAttendance } = require('../controllers/attendance.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

router.use(verifyToken);
router.use(requireRole('ADMIN')); // Restrict to Admin for now

router.get('/live', getLiveAttendance);
router.get('/', getAttendance);

router.post('/', auditLog('CREATE_ATTENDANCE', 'ATTENDANCE'), createAttendance);
router.put('/:id', auditLog('UPDATE_ATTENDANCE', 'ATTENDANCE'), updateAttendance);
router.delete('/:id', auditLog('DELETE_ATTENDANCE', 'ATTENDANCE'), deleteAttendance);

module.exports = router;
