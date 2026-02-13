const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Calculate redundancy settlement
const calculateRedundancy = async (req, res, next) => {
    try {
        const { employeeId, terminationType, factors } = req.body;

        if (!employeeId || !terminationType) {
            return errorResponse(res, "Missing required fields", "VALIDATION_ERROR", 400);
        }

        // Fetch employee details
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                department: true
            }
        });

        if (!employee) {
            return errorResponse(res, "Employee not found", "NOT_FOUND", 404);
        }

        // Calculate years of service
        const hireDate = new Date(employee.joinDate || new Date());
        const today = new Date();
        const yearsOfService = Math.floor((today - hireDate) / (1000 * 60 * 60 * 24 * 365.25));

        const baseSalary = parseFloat(employee.baseSalary || 0);
        const weeklyRate = baseSalary / 4.3333; // Standard approximation (52 weeks / 12 months)

        let redundancyPay = 0;
        let noticePay = 0;

        // Calculate redundancy pay based on termination type
        if (terminationType.includes('Redundancy') && factors?.multiplier) {
            // Jamaica Law: 2 weeks per year of service for first 10 years
            const years = Math.min(yearsOfService, 10);
            redundancyPay = weeklyRate * 2 * years;
        }

        // Calculate notice pay
        if (factors?.noticePay) {
            noticePay = baseSalary; // 1 month notice
        }

        const total = redundancyPay + noticePay;

        const settlement = {
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department?.name || 'General',
            yearsOfService,
            baseSalary,
            weeklyRate,
            redundancyPay,
            noticePay,
            totalSettlement: total,
            terminationType,
            calculatedAt: new Date()
        };

        return successResponse(res, settlement, "Settlement calculated successfully");
    } catch (error) {
        next(error);
    }
};

// Save redundancy record
const createRedundancy = async (req, res, next) => {
    try {
        const {
            companyId,
            employeeId,
            terminationType,
            redundancyPay,
            noticePay,
            totalSettlement,
            yearsOfService,
            reason,
            processedBy
        } = req.body;

        if (!companyId || !employeeId || !terminationType) {
            return errorResponse(res, "Missing required fields", "VALIDATION_ERROR", 400);
        }

        // 1. Check if employee exists and is active
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId }
        });

        if (!employee) {
            return errorResponse(res, "Employee not found", "NOT_FOUND", 404);
        }

        // 2. Check for existing redundancy to prevent duplicates
        const existing = await prisma.redundancy.findFirst({
            where: { employeeId, status: { not: 'REJECTED' } }
        });

        if (existing) {
            return errorResponse(res, "Redundancy settlement already exists for this employee", "DUPLICATE_RECORD", 400);
        }

        // 3. Create redundancy record
        const redundancy = await prisma.redundancy.create({
            data: {
                companyId,
                employeeId,
                terminationType,
                redundancyPay: parseFloat(redundancyPay || 0),
                noticePay: parseFloat(noticePay || 0),
                totalSettlement: parseFloat(totalSettlement || 0),
                yearsOfService: parseInt(yearsOfService || 0),
                reason: reason || '',
                status: 'APPROVED', // Auto-approved upon generation by authorized station
                processedBy: processedBy || 'SYSTEM',
                effectiveDate: new Date()
            }
        });

        // 4. TERMINATE EMPLOYEE STATUS
        await prisma.employee.update({
            where: { id: employeeId },
            data: { status: 'Terminated' }
        });

        // 5. CREATE BANK TRANSFER (Finance Integration)
        if (employee.bankAccount && employee.bankName) {
            await prisma.bankTransfer.create({
                data: {
                    companyId,
                    employeeId,
                    bankName: employee.bankName,
                    accountNumber: employee.bankAccount,
                    accountName: `${employee.firstName} ${employee.lastName}`,
                    amount: parseFloat(totalSettlement),
                    reference: `RED-${employee.id.slice(0, 8)}-${Date.now()}`,
                    transferDate: new Date(),
                    status: 'PENDING'
                }
            });
        }

        // 6. CREATE PAYROLL TRANSACTION (Payroll Integration)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const currentPeriod = `${months[now.getMonth()]}-${now.getFullYear()}`;

        await prisma.transaction.create({
            data: {
                companyId,
                employeeId,
                transactionDate: new Date(),
                type: 'EARNING',
                code: 'RED_SETTLE',
                description: `Final Settlement: ${terminationType}`,
                amount: parseFloat(totalSettlement),
                status: 'POSTED',
                period: currentPeriod,
                enteredBy: processedBy || 'REDUNDANCY_MOD'
            }
        });

        return successResponse(res, redundancy, "Redundancy record saved and fully integrated with Finance & Payroll", 201);
    } catch (error) {
        next(error);
    }
};

// Get redundancy records
const getRedundancies = async (req, res, next) => {
    try {
        const { companyId, employeeId, status, startDate, endDate } = req.query;
        const where = {};

        if (companyId) where.companyId = companyId;
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;

        if (startDate || endDate) {
            where.effectiveDate = {};
            if (startDate) where.effectiveDate.gte = new Date(startDate);
            if (endDate) where.effectiveDate.lte = new Date(endDate);
        }

        const redundancies = await prisma.redundancy.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: true
                    }
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { effectiveDate: 'desc' }
        });

        return successResponse(res, redundancies);
    } catch (error) {
        next(error);
    }
};

// Get single redundancy record
const getRedundancy = async (req, res, next) => {
    try {
        const { id } = req.params;

        const redundancy = await prisma.redundancy.findUnique({
            where: { id },
            include: {
                employee: true,
                company: true
            }
        });

        if (!redundancy) {
            return errorResponse(res, "Redundancy record not found", "NOT_FOUND", 404);
        }

        return successResponse(res, redundancy);
    } catch (error) {
        next(error);
    }
};

// Update redundancy status
const updateRedundancyStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, approvedBy, notes } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (approvedBy) updateData.approvedBy = approvedBy;
        if (notes) updateData.notes = notes;

        if (status === 'APPROVED' || status === 'COMPLETED') {
            updateData.approvedAt = new Date();
        }

        const redundancy = await prisma.redundancy.update({
            where: { id },
            data: updateData,
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, redundancy, "Redundancy status updated successfully");
    } catch (error) {
        next(error);
    }
};

// Delete redundancy record
const deleteRedundancy = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.redundancy.delete({
            where: { id }
        });

        return successResponse(res, null, "Redundancy record deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    calculateRedundancy,
    createRedundancy,
    getRedundancies,
    getRedundancy,
    updateRedundancyStatus,
    deleteRedundancy
};
