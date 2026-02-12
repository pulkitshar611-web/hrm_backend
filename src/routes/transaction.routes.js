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
    getTransactionRegister
} = require('../controllers/transaction.controller');

router.get('/', getTransactions);
router.get('/register', getTransactionRegister);
router.get('/:id', getTransaction);
router.post('/', createTransaction);
router.post('/bulk', bulkCreateTransactions);
router.post('/post', postTransactions);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
