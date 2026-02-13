const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, "Email and password are required", "VALIDATION_ERROR", 400);
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return errorResponse(res, "Invalid credentials", "UNAUTHORIZED", 401);
        }

        const accessToken = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
        );

        // Save refresh token to DB
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            }
        });

        return successResponse(res, {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken
        }, "Login successful");

    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return errorResponse(res, "Refresh token is required", "VALIDATION_ERROR", 400);
        }

        const savedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });

        if (!savedToken || savedToken.expiresAt < new Date()) {
            return errorResponse(res, "Invalid or expired refresh token", "UNAUTHORIZED", 401);
        }

        const accessToken = jwt.sign(
            { id: savedToken.user.id, role: savedToken.user.role, email: savedToken.user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );

        // Update session heartbeat
        await prisma.refreshToken.update({
            where: { token: refreshToken },
            data: {
                lastActive: new Date(),
                ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            }
        });

        return successResponse(res, { accessToken }, "Token refreshed successfully");

    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await prisma.refreshToken.delete({
                where: { token: refreshToken }
            }).catch(() => { });
        }
        return successResponse(res, null, "Logged out successfully");
    } catch (error) {
        next(error);
    }
};

const getSessions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessions = await prisma.refreshToken.findMany({
            where: { userId },
            select: { id: true, ipAddress: true, userAgent: true, lastActive: true, createdAt: true, token: true }
        });

        // Mark current session
        const currentToken = req.headers.authorization?.split(' ')[1]; // This is access token, not refresh token...
        // We can identify current session by matching the refresh token if provided in body or cookie, 
        // OR we can't easily identify which refresh token corresponds to this access token without storing jti.
        // However, the frontend sends 'current session' logic.

        // Actually, let's just return all. The frontend can deduce current by IP/UserAgent match or we can try better method later.
        // Or we can rely on the fact that the token used to authenticate this request is linked to a user.

        return successResponse(res, sessions);
    } catch (error) {
        next(error);
    }
};

const terminateSessions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { currentRefreshToken } = req.body;

        await prisma.refreshToken.deleteMany({
            where: {
                userId,
                token: { not: currentRefreshToken } // Keep current if provided
            }
        });

        return successResponse(res, null, "All other sessions terminated");
    } catch (error) {
        next(error);
    }
};

module.exports = { login, refreshToken, logout, getSessions, terminateSessions };
