const express = require('express');
const router = express.Router();
const salesShareController = require('../controllers/salesShare.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', salesShareController.getSalesShares);
router.post('/', salesShareController.saveSalesShares);

module.exports = router;
