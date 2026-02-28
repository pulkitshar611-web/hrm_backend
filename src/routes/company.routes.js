const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { verifyToken } = require('../middlewares/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Setup multer for logo uploads
const uploadDir = path.join(__dirname, '../../uploads/company-logos');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `logo-${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

router.use(verifyToken);
router.get('/', companyController.getCompanies);
router.post('/', companyController.createCompany);
router.put('/:id', companyController.updateCompany);
router.post('/:id/logo', upload.single('logo'), companyController.uploadLogo);

module.exports = router;
