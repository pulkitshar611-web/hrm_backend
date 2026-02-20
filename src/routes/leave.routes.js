const express = require('express');
const router = express.Router();
const { getLeaves, createLeave, updateLeave, deleteLeave, getLeaveBalances } = require('../controllers/leave.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

// Reading and Creating allowed for all authenticated users (STAFF, FINANCE, etc.)
router.get('/', getLeaves);
router.post('/', createLeave);
router.get('/balances/:employeeId', getLeaveBalances);

// Management restricted to higher roles
router.use(requireRole(['ADMIN', 'HR_MANAGER']));
router.put('/:id', updateLeave);
router.delete('/:id', deleteLeave);

module.exports = router;
