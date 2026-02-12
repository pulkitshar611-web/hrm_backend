const express = require('express');
const router = express.Router();
const {
    getAdvancePayments,
    getAdvancePayment,
    createAdvancePayment,
    updateAdvancePayment,
    approveAdvancePayment,
    rejectAdvancePayment,
    markAsPaid,
    deleteAdvancePayment,
    getAdvancePaymentSummary
} = require('../controllers/advancePayment.controller');

router.get('/', getAdvancePayments);
router.get('/summary', getAdvancePaymentSummary);
router.get('/:id', getAdvancePayment);
router.post('/', createAdvancePayment);
router.post('/:id/approve', approveAdvancePayment);
router.post('/:id/reject', rejectAdvancePayment);
router.post('/:id/paid', markAsPaid);
router.put('/:id', updateAdvancePayment);
router.delete('/:id', deleteAdvancePayment);

module.exports = router;
