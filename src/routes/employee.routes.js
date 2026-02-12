const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);
router.use(requireRole('ADMIN')); // Only Admin for Phase 1

router.get('/', employeeController.getEmployees);
router.post('/', employeeController.createEmployee);
router.put('/bulk-update', employeeController.bulkUpdateEmployees);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
