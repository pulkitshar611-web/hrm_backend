const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

router.use(verifyToken);
// router.use(requireRole('ADMIN')); // Removed global restriction to allow granular control

// Self-Service Profile Update (Any authenticated user with an Employee record)
router.put('/profile', auditLog('UPDATE_PROFILE', 'EMPLOYEE_SELF'), employeeController.updateSelfProfile);

router.get('/', requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE']), employeeController.getEmployees);
router.post('/', requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE']), auditLog('CREATE_EMPLOYEE', 'EMPLOYEE'), employeeController.createEmployee);
router.put('/bulk-update', requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE']), employeeController.bulkUpdateEmployees);
router.put('/:id', requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE']), auditLog('UPDATE_EMPLOYEE', 'EMPLOYEE'), employeeController.updateEmployee);
router.delete('/:id', requireRole(['ADMIN', 'HR_MANAGER']), auditLog('DELETE_EMPLOYEE', 'EMPLOYEE'), employeeController.deleteEmployee);

module.exports = router;
