const prisma = require('../config/db');
const { successResponse } = require('../utils/response');

const getAuditLogs = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            // include: { user: true } // If userId links to User
        });

        // Enrich logs with usernames if possible
        const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });

        const usersMap = users.reduce((acc, user) => {
            acc[user.id] = user.username;
            return acc;
        }, {});

        const enrichedLogs = logs.map(l => ({
            ...l,
            username: usersMap[l.userId] || l.userId || 'System'
        }));

        return successResponse(res, enrichedLogs);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAuditLogs };
