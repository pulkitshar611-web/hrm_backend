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

router.get('/', getTransactions);
router.get('/register', getTransactionRegister);
router.get('/:id', getTransaction);
router.post('/', createTransaction);
// Destructure new function if not already imported (handled in separate step if needed but usually modify import block)
router.post('/bulk', bulkCreateTransactions);
router.post('/post', postTransactions);
router.post('/:id/void', voidTransaction); // Added void route
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
