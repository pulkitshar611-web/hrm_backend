const express = require('express');
const router = express.Router();
const {
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    bulkCreateTransactions,
    postTransactions,
    getTransactionRegister,
    voidTransaction
} = require('../controllers/transaction.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

router.use(verifyToken);

router.get('/', getTransactions);
router.get('/register', getTransactionRegister);
router.get('/:id', getTransaction);

router.post('/', auditLog('CREATE_TRANSACTION', 'TRANSACTION'), createTransaction);
router.post('/bulk', auditLog('BULK_CREATE', 'TRANSACTION'), bulkCreateTransactions);
router.post('/post', auditLog('POST_TRANSACTION', 'TRANSACTION'), postTransactions);
router.post('/:id/void', auditLog('VOID_TRANSACTION', 'TRANSACTION'), voidTransaction);

router.put('/:id', auditLog('UPDATE_TRANSACTION', 'TRANSACTION'), updateTransaction);
router.delete('/:id', requireRole('ADMIN'), auditLog('DELETE_TRANSACTION', 'TRANSACTION'), deleteTransaction);

module.exports = router;
