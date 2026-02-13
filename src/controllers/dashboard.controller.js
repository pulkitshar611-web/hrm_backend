const prisma = require('../config/db');
const { successResponse } = require('../utils/response');

const getAdminStats = async (req, res, next) => {
    try {
        const { companyId } = req.query;
        // Context-aware filtering
        const role = req.user.role;
        const isGlobalAdmin = role === 'ADMIN';

        // Base query for company-specific data
        // If user is not global admin or a company is selected, filter by company
        // However, 'User' table is global (system logins), so activeUsers is always global or we need to link users to companies (which might not exist yet).
        // For now, System Users are global.

        let employeeCount = 0;
        let auditCount = 0;
        let processingCount = 0;
        let userCount = 0;

        if (isGlobalAdmin && !companyId) {
            // Global View
            [userCount, auditCount, employeeCount, processingCount] = await Promise.all([
                prisma.user.count(),
                prisma.auditLog.count(),
                prisma.employee.count(),
                prisma.processingLog.count()
            ]);
        } else {
            // Company View (For HR/Finance or Admin selecting a company)
            // If No company ID provided for non-admin, return 0 or handle error? Frontend checks context.

            // For now, assuming companyId is passed if context is selected.
            if (companyId) {
                [employeeCount, processingCount] = await Promise.all([
                    prisma.employee.count({ where: { companyId } }),
                    prisma.processingLog.count({ where: { companyId } })
                ]);
                // Audit logs might not have companyId directly in schema (it has entityId). 
                // We'll skip precise audit filtering for now or check if we added companyId to auditlog.
                // Current schema: entity, entityId, userId. 
                // To filter audit logs by company, we'd need to join or store companyId.
                // For now, return global for audit or 0. Let's return 0 to avoid confusion if we can't filter.
                // Or better, return total system logs if role is ADMIN, else 0?
                // Let's keep audit logs global for now as "System Events"
                auditCount = await prisma.auditLog.count();
                userCount = await prisma.user.count(); // Users are global
            }
        }

        const dbConnected = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

        const stats = [
            { label: 'System Status', value: 'Healthy', sub: `Active: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` },
            { label: 'System Users', value: userCount.toString(), sub: 'Global Access' },
            { label: 'Employees', value: employeeCount.toString(), sub: companyId ? 'Selected Company' : 'Total Registry' },
            { label: 'DB Health', value: dbConnected ? 'Optimal' : 'Degraded', sub: dbConnected ? 'Connected' : 'Error' },
            { label: 'Processing Tasks', value: processingCount.toString(), sub: companyId ? 'Company Logs' : 'System Logs' },
            { label: 'Security Events', value: auditCount.toString(), sub: 'Audit Trail' },
        ];

        return successResponse(res, stats);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAdminStats };
