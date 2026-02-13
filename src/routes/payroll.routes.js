const express = require('express');
const router = express.Router();
const {
    getPayrolls,
    createPayroll,
    updatePayroll,
    deletePayroll,
    generatePayrolls,
    finalizeBatch,
    syncPayrolls,
    getPayrollBatches,
    sendPayrollEmail,
    bulkSendEmails
} = require('../controllers/payroll.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

router.use(verifyToken);
router.use(requireRole('ADMIN'));

router.get('/', getPayrolls);
router.get('/batches', getPayrollBatches);

router.post('/', auditLog('CREATE_PAYROLL', 'PAYROLL'), createPayroll);
router.post('/generate', auditLog('GENERATE_PAYROLLS', 'PAYROLL'), generatePayrolls);
router.post('/sync', auditLog('SYNC_PAYROLLS', 'PAYROLL'), syncPayrolls);
router.post('/finalize', auditLog('FINALIZE_BATCH', 'PAYROLL'), finalizeBatch);
router.post('/:payrollId/email', auditLog('SEND_PAYSLIP', 'PAYROLL'), sendPayrollEmail);
router.post('/bulk-email', auditLog('BULK_EMAIL', 'PAYROLL'), bulkSendEmails);

router.put('/:id', auditLog('UPDATE_PAYROLL', 'PAYROLL'), updatePayroll);
router.delete('/:id', auditLog('DELETE_PAYROLL', 'PAYROLL'), deletePayroll);

module.exports = router;
