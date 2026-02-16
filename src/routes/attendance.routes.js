const express = require('express');
const router = express.Router();
const { getAttendance, createAttendance, updateAttendance, deleteAttendance, getLiveAttendance } = require('../controllers/attendance.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

router.use(verifyToken);
// Public/Read-only routes (accessible by Staff/Finance/TimeKeepers)
router.get('/live', requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE', 'STAFF']), getLiveAttendance);
router.get('/', requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE', 'STAFF']), getAttendance);

// Protected/Write routes (Restricted to Admin/HR)
router.post('/', requireRole(['ADMIN', 'HR_MANAGER']), auditLog('CREATE_ATTENDANCE', 'ATTENDANCE'), createAttendance);
router.put('/:id', requireRole(['ADMIN', 'HR_MANAGER']), auditLog('UPDATE_ATTENDANCE', 'ATTENDANCE'), updateAttendance);
router.delete('/:id', requireRole(['ADMIN', 'HR_MANAGER']), auditLog('DELETE_ATTENDANCE', 'ATTENDANCE'), deleteAttendance);

module.exports = router;
