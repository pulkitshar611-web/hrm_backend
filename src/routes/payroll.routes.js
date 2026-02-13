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

router.get('/', getPayrolls);
router.get('/batches', getPayrollBatches);
router.post('/', createPayroll);
router.post('/generate', generatePayrolls);
router.post('/sync', syncPayrolls);
router.post('/finalize', finalizeBatch);
router.post('/:payrollId/email', sendPayrollEmail);
router.post('/bulk-email', bulkSendEmails);
router.put('/:id', updatePayroll);
router.delete('/:id', deletePayroll);

module.exports = router;
