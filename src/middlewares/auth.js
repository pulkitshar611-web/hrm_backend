const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        console.error("Auth Error: No token provided");
        return errorResponse(res, "Access denied. No token provided.", "UNAUTHORIZED", 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Auth Error:", error.message);
        if (error.name === 'TokenExpiredError') {
            return errorResponse(res, "Token expired", "TOKEN_EXPIRED", 401);
        }
        return errorResponse(res, "Invalid token", "INVALID_TOKEN", 401);
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return errorResponse(res, `Access denied. ${allowedRoles.join(' or ')} role required.`, "FORBIDDEN", 403);
        }
        next();
    };
};

module.exports = { verifyToken, requireRole };
