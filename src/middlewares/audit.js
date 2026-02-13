const prisma = require('../config/db');

/**
 * Middleware to record system activity logs
 * @param {string} action - The action performed (e.g., 'LOGIN', 'CREATE_EMPLOYEE')
 * @param {string} entity - The target entity (e.g., 'EMPLOYEE', 'PAYROLL')
 */
const auditLog = (action, entity) => {
    return async (req, res, next) => {
        const originalJson = res.json;

        // Wrap res.json to capture the successful response and log it
        res.json = function (data) {
            res.locals.responseData = data;

            // Only log successful operations (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const userId = req.user?.id;
                const entityId = req.params?.id || data?.data?.id || null;
                const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                const userAgent = req.headers['user-agent'];

                // Fire and forget logging to avoid blocking the response
                prisma.auditLog.create({
                    data: {
                        userId: userId,
                        action: action,
                        entity: entity,
                        entityId: entityId ? String(entityId) : null,
                        ipAddress: ipAddress,
                        userAgent: userAgent,
                        metadata: {
                            params: req.params,
                            query: req.query,
                            method: req.method,
                            url: req.originalUrl
                        }
                    }
                }).catch(err => console.error('Audit Logging Failed:', err));
            }

            return originalJson.call(this, data);
        };

        next();
    };
};

module.exports = { auditLog };
