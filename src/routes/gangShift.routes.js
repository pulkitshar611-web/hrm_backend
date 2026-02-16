const express = require('express');
const router = express.Router();
const {
    getGangs,
    getAssignments,
    saveAssignments
} = require('../controllers/gangShift.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);
router.use(requireRole(['ADMIN', 'HR_MANAGER', 'FINANCE', 'SUPERVISOR']));

router.get('/gangs', getGangs);
router.get('/assignments', getAssignments);
router.post('/assignments', saveAssignments);

module.exports = router;
