const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);
router.get('/', companyController.getCompanies);
router.post('/', companyController.createCompany);
router.put('/:id', companyController.updateCompany);

module.exports = router;
