const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

router.use(verifyToken);
// router.use(requireRole('ADMIN')); // Removed global restriction to allow granular control

router.get('/', requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE']), employeeController.getEmployees);
router.post('/', requireRole('ADMIN'), auditLog('CREATE_EMPLOYEE', 'EMPLOYEE'), employeeController.createEmployee);
router.put('/bulk-update', requireRole('ADMIN'), employeeController.bulkUpdateEmployees);
router.put('/:id', requireRole('ADMIN'), auditLog('UPDATE_EMPLOYEE', 'EMPLOYEE'), employeeController.updateEmployee);
router.delete('/:id', requireRole('ADMIN'), auditLog('DELETE_EMPLOYEE', 'EMPLOYEE'), employeeController.deleteEmployee);

module.exports = router;
