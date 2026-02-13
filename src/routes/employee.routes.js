const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

router.use(verifyToken);
router.use(requireRole('ADMIN')); // Only Admin for Phase 1

router.get('/', verifyToken, employeeController.getEmployees);
router.post('/', verifyToken, auditLog('CREATE_EMPLOYEE', 'EMPLOYEE'), employeeController.createEmployee);
router.put('/bulk-update', employeeController.bulkUpdateEmployees);
router.put('/:id', verifyToken, auditLog('UPDATE_EMPLOYEE', 'EMPLOYEE'), employeeController.updateEmployee);
router.delete('/:id', verifyToken, requireRole('ADMIN'), auditLog('DELETE_EMPLOYEE', 'EMPLOYEE'), employeeController.deleteEmployee);

module.exports = router;
