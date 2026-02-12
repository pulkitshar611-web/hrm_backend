const express = require('express');
const router = express.Router();
const {
    getBankTransfers,
    getBankTransfer,
    createBankTransfer,
    updateBankTransfer,
    createBatchTransfer,
    processBankTransfers,
    exportBankFile,
    deleteBankTransfer
} = require('../controllers/bankTransfer.controller');

router.get('/', getBankTransfers);
router.get('/export', exportBankFile);
router.get('/:id', getBankTransfer);
router.post('/', createBankTransfer);
router.post('/batch', createBatchTransfer);
router.post('/process', processBankTransfers);
router.put('/:id', updateBankTransfer);
router.delete('/:id', deleteBankTransfer);

module.exports = router;
