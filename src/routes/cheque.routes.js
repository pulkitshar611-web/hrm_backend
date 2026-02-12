const express = require('express');
const router = express.Router();
const {
    getCheques,
    getCheque,
    createCheque,
    updateCheque,
    printCheques,
    voidCheque,
    getChequeHistory,
    deleteCheque
} = require('../controllers/cheque.controller');

router.get('/', getCheques);
router.get('/history', getChequeHistory);
router.get('/:id', getCheque);
router.post('/', createCheque);
router.post('/print', printCheques);
router.post('/:id/void', voidCheque);
router.put('/:id', updateCheque);
router.delete('/:id', deleteCheque);

module.exports = router;
