const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const {
    getTransactionCodes,
    createTransactionCode,
    updateTransactionCode,
    deleteTransactionCode
} = require('../controllers/transactionCode.controller');

router.use(verifyToken);

router.get('/', getTransactionCodes);
router.post('/', createTransactionCode);
router.put('/:id', updateTransactionCode);
router.delete('/:id', deleteTransactionCode);

module.exports = router;
