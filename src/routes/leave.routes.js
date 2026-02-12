const express = require('express');
const router = express.Router();
const { getLeaves, createLeave, updateLeave, deleteLeave } = require('../controllers/leave.controller');

router.get('/', getLeaves);
router.post('/', createLeave);
router.put('/:id', updateLeave);
router.delete('/:id', deleteLeave);

module.exports = router;
