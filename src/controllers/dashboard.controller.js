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

const getEmployeeStats = async (req, res, next) => {
    try {
        const userEmail = req.user.email;

        // 1. Find the employee record linked to this user's email
        const employee = await prisma.employee.findUnique({
            where: { email: userEmail },
            include: {
                company: true,
                payrolls: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                leaves: {
                    where: { status: 'Approved' }
                },
                advancePayments: {
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }
            }
        });

        if (!employee) {
            // Return dummy or empty if no link exists yet
            return successResponse(res, {
                stats: [
                    { label: 'Next Pay Date', value: 'N/A', sub: 'Contact HR' },
                    { label: 'Leave Balance', value: '0 Days', sub: 'Vacation Time' },
                    { label: 'Net Pay (Last)', value: '$0.00', sub: 'No Records' },
                    { label: 'Tax Status', value: 'Pending', sub: 'Verify Profile' },
                ],
                recentDocuments: []
            });
        }

        // 2. Calculate Next Pay Date (Simplified logic: 28th of current or next month)
        const now = new Date();
        let payDate = new Date(now.getFullYear(), now.getMonth(), 28);
        if (now.getDate() > 28) {
            payDate.setMonth(payDate.getMonth() + 1);
        }
        const diffDays = Math.ceil((payDate - now) / (1000 * 60 * 60 * 24));
        const nextPayDateStr = payDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // 3. Calculate Leave Balance (Baseline 14 - approved)
        // In a real system, this would be stored or calculated from accruals
        const approvedLeaveDays = employee.leaves.reduce((sum, l) => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return sum + days;
        }, 0);
        const leaveBalance = Math.max(0, 14 - approvedLeaveDays);

        // 4. Get Last Net Pay
        const lastPayroll = employee.payrolls[0];
        const lastNetPay = lastPayroll ? lastPayroll.netSalary : 0;
        const lastPayMonth = lastPayroll ? lastPayroll.period : 'N/A';

        // 5. Recent Documents
        const recentDocuments = [
            ...employee.payrolls.map(p => ({
                name: `Payslip_${p.period}.pdf`,
                date: new Date(p.createdAt).toLocaleDateString(),
                type: 'PAY',
                rawDate: p.createdAt
            })),
            ...employee.advancePayments.map(a => ({
                name: `Advance_${a.id.substring(0, 5)}.pdf`,
                date: new Date(a.createdAt).toLocaleDateString(),
                type: 'FIN',
                rawDate: a.createdAt
            }))
        ].sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate)).slice(0, 5);

        const response = {
            stats: [
                { label: 'Next Pay Date', value: nextPayDateStr, sub: `in ${diffDays} days` },
                { label: 'Leave Balance', value: `${leaveBalance} Days`, sub: 'Vacation Time' },
                { label: 'Net Pay (Last)', value: `$${(parseFloat(lastNetPay) / 1000).toFixed(1)}k`, sub: lastPayMonth },
                { label: 'Tax Status', value: 'Compliant', sub: 'P24 Available' },
            ],
            recentDocuments,
            employee: {
                id: employee.id,
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                designation: employee.designation,
                phone: employee.phone,
                street: employee.street,
                city: employee.city,
                parish: employee.parish,
                bankName: employee.bankName,
                bankAccount: employee.bankAccount,
                status: employee.status
            }
        };

        return successResponse(res, response);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAdminStats, getEmployeeStats };
