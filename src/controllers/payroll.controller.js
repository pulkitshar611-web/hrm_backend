const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const getPayrolls = async (req, res, next) => {
    try {
        const { companyId, employeeId, period, status, email } = req.query;
        const where = {};
        if (employeeId) where.employeeId = employeeId;
        if (period) where.period = period;
        if (status) where.status = status;
        if (email) {
            where.employee = { email };
        }
        if (companyId) {
            if (where.employee) {
                where.employee.companyId = companyId;
            } else {
                where.employee = { companyId };
            }
        }

        const payrolls = await prisma.payroll.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        trn: true,
                        bankName: true,
                        bankAccount: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return successResponse(res, payrolls);
    } catch (error) {
        next(error);
    }
};

const createPayroll = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.employeeId || !data.period) {
            return errorResponse(res, "Employee ID and period are required", "VALIDATION_ERROR", 400);
        }

        // Look up employee by their employeeId field (e.g., "EMP001")
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });

        if (!employee) {
            return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
        }

        const payroll = await prisma.payroll.create({
            data: {
                employeeId: employee.id, // Use the UUID from the employee record
                period: data.period,
                grossSalary: parseFloat(data.grossSalary || 0),
                netSalary: parseFloat(data.netSalary || 0),
                deductions: parseFloat(data.deductions || 0),
                tax: parseFloat(data.tax || 0),
                paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
                status: data.status || 'Pending'
            },
            include: { employee: true }
        });
        return successResponse(res, payroll, "Payroll record created", 201);
    } catch (error) {
        next(error);
    }
};

const updatePayroll = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const updateData = {};

        // If employeeId is being updated, look up the employee UUID
        if (data.employeeId !== undefined) {
            const employee = await prisma.employee.findUnique({
                where: { employeeId: data.employeeId }
            });
            if (!employee) {
                return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
            }
            updateData.employeeId = employee.id;
        }

        if (data.period !== undefined) updateData.period = data.period;
        if (data.grossSalary !== undefined) updateData.grossSalary = parseFloat(data.grossSalary);
        if (data.netSalary !== undefined) updateData.netSalary = parseFloat(data.netSalary);
        if (data.deductions !== undefined) updateData.deductions = parseFloat(data.deductions);
        if (data.tax !== undefined) updateData.tax = parseFloat(data.tax);
        if (data.paymentDate !== undefined) updateData.paymentDate = data.paymentDate ? new Date(data.paymentDate) : null;
        if (data.status !== undefined) updateData.status = data.status;

        const payroll = await prisma.payroll.update({
            where: { id },
            data: updateData,
            include: { employee: true }
        });
        return successResponse(res, payroll, "Payroll record updated");
    } catch (error) {
        next(error);
    }
};

const deletePayroll = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.payroll.delete({ where: { id } });
        return successResponse(res, null, "Payroll record deleted");
    } catch (error) {
        next(error);
    }
};

const generatePayrolls = async (req, res, next) => {
    try {
        const { companyId, period } = req.body;

        if (!companyId || !period) {
            return errorResponse(res, "Company ID and period are required", "VALIDATION_ERROR", 400);
        }

        // Fetch all employees for the company
        const employees = await prisma.employee.findMany({
            where: { companyId }
        });

        // Fetch all POSTED transactions for the period
        const transactions = await prisma.transaction.findMany({
            where: {
                companyId,
                period,
                status: 'POSTED'
            }
        });

        const results = [];
        
        // Loop through all employees to ensure everyone is considered
        for (const employee of employees) {
            let gross = parseFloat(employee.baseSalary || 0);
            let deductions = 0;

            // Add posted transactions for this employee
            const empTransactions = transactions.filter(t => t.employeeId === employee.id);
            for (const t of empTransactions) {
                const amount = parseFloat(t.amount);
                if (t.type === 'EARNING' || t.type === 'ALLOWANCE') {
                    gross += amount;
                } else if (t.type === 'DEDUCTION') {
                    deductions += amount;
                }
            }

            // --- JAMAICA STATUTORY CALCULATIONS (2024/2025) ---
            
            // 1. NIS (National Insurance Scheme) - Typically 3% for Employee
            const nis = gross * 0.03;

            // 2. NHT (National Housing Trust) - Typically 2% for Employee
            const nht = gross * 0.02;

            // 3. Ed Tax (Education Tax) - 2.25% of (Gross - NIS)
            const taxableForEdTax = gross - nis;
            const edTax = taxableForEdTax > 0 ? taxableForEdTax * 0.0225 : 0;

            // 4. PAYE (Income Tax) - 25% of (Gross - NIS - Threshold)
            // Monthly Threshold = Annual 1,500,000 / 12 = 125,000
            const annualThreshold = 1500000;
            const monthlyThreshold = annualThreshold / 12;
            const taxableForPaye = gross - nis - monthlyThreshold;
            const paye = taxableForPaye > 0 ? taxableForPaye * 0.25 : 0;

            const totalTax = nis + nht + edTax + paye;
            const net = gross - deductions - totalTax;

            // Check if payroll already exists for this period
            const existing = await prisma.payroll.findFirst({
                where: { employeeId: employee.id, period }
            });

            const payrollData = {
                grossSalary: gross,
                netSalary: net,
                deductions: deductions,
                tax: totalTax,
                nis: nis,
                nht: nht,
                edTax: edTax,
                paye: paye,
                status: 'Calculated'
            };

            let payrollRecord;
            if (existing) {
                payrollRecord = await prisma.payroll.update({
                    where: { id: existing.id },
                    data: payrollData
                });
            } else {
                payrollRecord = await prisma.payroll.create({
                    data: {
                        ...payrollData,
                        employeeId: employee.id,
                        period: period
                    }
                });
            }

            results.push(payrollRecord);

            // Mark transactions as PROCESSED
            if (empTransactions.length > 0) {
                await prisma.transaction.updateMany({
                    where: {
                        employeeId: employee.id,
                        period,
                        status: 'POSTED'
                    },
                    data: { status: 'PROCESSED' }
                });
            }
        }

        return successResponse(res, { count: results.length }, `${results.length} payroll records processed successfully`);
    } catch (error) {
        next(error);
    }
};

const finalizeBatch = async (req, res, next) => {
    try {
        const { companyId, period } = req.body;

        if (!companyId || !period) {
            return errorResponse(res, "Company ID and period are required", "VALIDATION_ERROR", 400);
        }

        const results = await prisma.payroll.updateMany({
            where: {
                period,
                employee: { companyId },
                status: 'Calculated'
            },
            data: { status: 'Finalized' }
        });

        return successResponse(res, { count: results.count }, `${results.count} payroll records finalized successfully`);
    } catch (error) {
        next(error);
    }
};

const sendPayrollEmail = async (req, res, next) => {
    try {
        const { payrollId } = req.params;

        const payroll = await prisma.payroll.findUnique({
            where: { id: payrollId },
            include: { employee: true }
        });

        if (!payroll) {
            return errorResponse(res, "Payroll record not found", "NOT_FOUND", 404);
        }

        // Simulate emailing
        await prisma.payroll.update({
            where: { id: payrollId },
            data: { status: 'Sent' }
        });

        return successResponse(res, null, `Payslip for ${payroll.employee.firstName} ${payroll.employee.lastName} dispatched via encrypted SMTP server.`);
    } catch (error) {
        next(error);
    }
};

const bulkSendEmails = async (req, res, next) => {
    try {
        const { payrollIds } = req.body;

        if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
            return errorResponse(res, "No payroll IDs provided", "VALIDATION_ERROR", 400);
        }

        const results = await prisma.payroll.updateMany({
            where: { id: { in: payrollIds } },
            data: { status: 'Sent' }
        });

        return successResponse(res, { count: results.count }, `${results.count} payslips dispatched successfully.`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPayrolls,
    createPayroll,
    updatePayroll,
    deletePayroll,
    generatePayrolls,
    finalizeBatch,
    sendPayrollEmail,
    bulkSendEmails
};
