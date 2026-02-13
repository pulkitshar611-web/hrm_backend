const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/response');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { auditLog } = require('../middlewares/audit');

router.use(verifyToken);
router.use(verifyToken);

// Self-service routes
router.get('/me', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, username: true, email: true, role: true, windowPreferences: true }
        });
        return successResponse(res, user);
    } catch (error) {
        next(error);
    }
});

router.put('/preferences', async (req, res, next) => {
    try {
        const { windowPreferences } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { windowPreferences },
            select: { windowPreferences: true }
        });
        return successResponse(res, user, "Preferences updated");
    } catch (error) {
        next(error);
    }
});

// Admin-only routes
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

router.post('/', auditLog('CREATE_USER', 'USER'), async (req, res, next) => {
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

router.put('/:id', auditLog('UPDATE_USER', 'USER'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { username, email, role, password } = req.body;
        const updateData = { username, email, role };
        if (password) updateData.password = await bcrypt.hash(password, 10);

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, username: true, email: true, role: true }
        });
        return successResponse(res, user, "User updated successfully");
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', auditLog('DELETE_USER', 'USER'), async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        return successResponse(res, null, "User deleted successfully");
    } catch (error) {
        next(error);
    }
});

module.exports = router;
