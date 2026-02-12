const express = require('express');
const router = express.Router();
const {
    getGangs,
    getAssignments,
    saveAssignments
} = require('../controllers/gangShift.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/gangs', getGangs);
router.get('/assignments', getAssignments);
router.post('/assignments', saveAssignments);

module.exports = router;
