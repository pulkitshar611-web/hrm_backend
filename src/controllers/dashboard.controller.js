const prisma = require('../config/db');
const { successResponse } = require('../utils/response');

const getAdminStats = async (req, res, next) => {
    try {
        const { companyId } = req.query;
        const companyWhere = companyId ? { companyId } : {};

        const [activeUsers, auditLogsCount, employeesCount, processingLogsCount] = await Promise.all([
            prisma.user.count(),
            prisma.auditLog.count().catch(() => 0),
            prisma.employee.count({ where: companyWhere }),
            prisma.processingLog.count({ where: companyWhere }).catch(() => 0)
        ]);

        // Simple check for DB health
        const dbConnected = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

        const stats = [
            { label: 'System Status', value: 'Healthy', icon: null, sub: `Active Session: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` },
            { label: 'Active Users', value: activeUsers.toString(), icon: null, sub: 'System Roles' },
            { label: 'Employees', value: employeesCount.toString(), icon: null, sub: companyId ? 'Selected Company' : 'Total Directory' },
            { label: 'Database Health', value: dbConnected ? 'Optimal' : 'Degraded', icon: null, sub: dbConnected ? 'Connected' : 'Error Detected' },
            { label: 'Processing Output', value: processingLogsCount.toString(), icon: null, sub: companyId ? 'Company Tasks' : 'Total System Tasks' },
            { label: 'Audit Logs', value: auditLogsCount.toString(), icon: null, sub: 'Security Events' },
        ];

        return successResponse(res, stats);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAdminStats };
