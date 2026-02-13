const express = require('express');
const router = express.Router();
const { getAttendance, createAttendance, updateAttendance, deleteAttendance, getLiveAttendance } = require('../controllers/attendance.controller');

router.get('/live', getLiveAttendance);
router.get('/', getAttendance);
router.post('/', createAttendance);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);


module.exports = router;
