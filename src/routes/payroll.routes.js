const express = require('express');
const router = express.Router();
const {
    getPayrolls,
    createPayroll,
    updatePayroll,
    deletePayroll,
    generatePayrolls,
    finalizeBatch,
    sendPayrollEmail,
    bulkSendEmails
} = require('../controllers/payroll.controller');

router.get('/', getPayrolls);
router.post('/', createPayroll);
router.post('/generate', generatePayrolls);
router.post('/finalize', finalizeBatch);
router.post('/:payrollId/email', sendPayrollEmail);
router.post('/bulk-email', bulkSendEmails);
router.put('/:id', updatePayroll);
router.delete('/:id', deletePayroll);

module.exports = router;
