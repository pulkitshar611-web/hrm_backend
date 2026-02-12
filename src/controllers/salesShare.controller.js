const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get sales shares for a company and period
const getSalesShares = async (req, res, next) => {
    try {
        const { companyId, period } = req.query;
        if (!companyId || !period) {
            return errorResponse(res, "Company ID and Period are required", "VALIDATION_ERROR", 400);
        }

        // Fetch all employees for the company first to ensure we show everyone
        const employees = await prisma.employee.findMany({
            where: { companyId },
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                parish: true, // Used as Region in UI
                status: true
            }
        });

        // Fetch sales shares for the given period
        const salesShares = await prisma.salesShare.findMany({
            where: {
                companyId,
                period
            }
        });

        // Map sales shares to employees
        const data = employees.map(emp => {
            const share = salesShares.find(s => s.employeeId === emp.id);
            return {
                id: emp.id,
                empId: emp.employeeId,
                name: `${emp.firstName} ${emp.lastName}`,
                region: emp.parish || 'GLOBAL', // Using parish as Region
                totalSales: share ? parseFloat(share.totalSales) : 0,
                commissionRate: share ? parseFloat(share.commissionRate) : 5.0, // Default 5%
                shareAmount: share ? parseFloat(share.shareAmount) : 0,
                status: emp.status
            };
        });

        return successResponse(res, data);
    } catch (error) {
        next(error);
    }
};

// Save sales shares (upsert)
const saveSalesShares = async (req, res, next) => {
    try {
        const { companyId, period, salesShares } = req.body;
        if (!companyId || !period || !Array.isArray(salesShares)) {
            return errorResponse(res, "Invalid payload", "VALIDATION_ERROR", 400);
        }

        const results = await prisma.$transaction(
            salesShares.map(s => {
                const data = {
                    companyId,
                    employeeId: s.employeeId,
                    period,
                    totalSales: s.totalSales,
                    commissionRate: s.commissionRate,
                    shareAmount: s.shareAmount,
                    status: 'GENERATED'
                };

                return prisma.salesShare.upsert({
                    where: {
                        employeeId_period: {
                            employeeId: s.employeeId,
                            period
                        }
                    },
                    update: {
                        totalSales: s.totalSales,
                        commissionRate: s.commissionRate,
                        shareAmount: s.shareAmount
                    },
                    create: data
                });
            })
        );

        return successResponse(res, results, "Sales shares saved successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSalesShares,
    saveSalesShares
};
