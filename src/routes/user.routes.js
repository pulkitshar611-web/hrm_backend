const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/response');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);
router.use(requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, email: true, role: true, createdAt: true }
        });
        return successResponse(res, users);
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password || !role) {
            return errorResponse(res, "All fields are required", "VALIDATION_ERROR", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, email, password: hashedPassword, role },
            select: { id: true, username: true, email: true, role: true }
        });
        return successResponse(res, user, "System user created successfully", 201);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
