const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Setup multer for temporary uploads
const uploadDir = path.join(__dirname, '../../temp_uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Routes
router.get('/export', fileController.exportData);
router.post('/import', upload.single('file'), fileController.importData);
router.post('/backup', fileController.backupSystem);
router.post('/restore', upload.single('file'), fileController.restoreSystem);
router.get('/logs', fileController.getBackupLogs);
router.get('/download/:filename', fileController.downloadBackup);

module.exports = router;
