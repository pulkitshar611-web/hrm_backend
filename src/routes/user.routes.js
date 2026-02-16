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

// Update user security (password)
router.put('/security', auditLog('CHANGE_PASSWORD', 'USER_SELF'), async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return errorResponse(res, "Current and new passwords are required", "VALIDATION_ERROR", 400);
        }

        // Get user for password verification
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return errorResponse(res, "User not found", "NOT_FOUND", 404);

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return errorResponse(res, "Incorrect current password", "AUTH_FAILED", 401);
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        return successResponse(res, null, "Security credentials updated successfully");
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
        const { username, email, password, role, companyId } = req.body;

        if (!username || !email || !password || !role) {
            return errorResponse(res, "All fields are required", "VALIDATION_ERROR", 400);
        }

        // ADMIN users should not have a companyId
        const finalCompanyId = role === 'ADMIN' ? null : companyId;

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, email, password: hashedPassword, role, companyId: finalCompanyId },
            select: { id: true, username: true, email: true, role: true, companyId: true }
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
