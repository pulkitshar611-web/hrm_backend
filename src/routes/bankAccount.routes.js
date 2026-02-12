const express = require('express');
const router = express.Router();
const {
    getBankAccounts,
    getBankAccount,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount
} = require('../controllers/bankAccount.controller');

router.get('/', getBankAccounts);
router.get('/:id', getBankAccount);
router.post('/', createBankAccount);
router.put('/:id', updateBankAccount);
router.delete('/:id', deleteBankAccount);

module.exports = router;
