const express = require('express');
const router = express.Router();
const { uploadLogo, deleteLogo } = require('../controllers/upload.controller');
const { verifyToken } = require('../middlewares/auth');

// POST /api/upload/logo  — base64 body, no multer
router.post('/logo', verifyToken, uploadLogo);

// DELETE /api/upload/logo — pass publicId in body
router.delete('/logo', verifyToken, deleteLogo);

module.exports = router;
