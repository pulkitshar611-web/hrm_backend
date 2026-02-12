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
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
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

module.exports = { login, refreshToken, logout };
