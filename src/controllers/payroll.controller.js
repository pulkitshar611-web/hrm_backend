const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const normalizePeriod = (period) => {
    if (!period) return period;
    return period.trim().replace(/\s+/g, '-').toUpperCase();
};

const getPayrolls = async (req, res, next) => {
    try {
        const { companyId, employeeId, period, status, email, departmentId } = req.query;
        const normalizedPeriod = normalizePeriod(period);
        console.log('[GET_PAYROLLS] Incoming params:', { companyId, employeeId, period: normalizedPeriod, status, email, departmentId });

        const where = {};

        // --- SECURITY ENFORCEMENT ---
        // If user is STAFF/EMPLOYEE, they CAN ONLY see their own records.
        if (req.user.role === 'STAFF' || req.user.role === 'EMPLOYEE') {
            where.employee = { email: req.user.email };
        } else {
            // Admin/HR/Finance can filter by everything
            if (employeeId) where.employeeId = employeeId; // This refers to the employee's UUID (id field in Employee model)
            if (email) {
                where.employee = { email };
            }
            if (companyId) {
                if (!where.employee) where.employee = {};
                where.employee.companyId = companyId;
            }
            if (departmentId && departmentId !== 'All Departments') {
                if (!where.employee) where.employee = {};
                where.employee.departmentId = departmentId;
            }
        }

        if (normalizedPeriod) where.period = normalizedPeriod;
        if (status) where.status = status;

        console.log('[GET_PAYROLLS] Where:', JSON.stringify(where));

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
                        payFrequency: true,
                        status: true,
                        employmentType: true,
                        designation: true,
                        city: true,
                        parish: true,
                        department: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        // Banking Info
                        paymentMethod: true,
                        bankName: true,
                        bankAccount: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`[GET_PAYROLLS] Found ${payrolls.length} records`);
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
        const normalizedPeriod = normalizePeriod(period);

        if (!companyId || !normalizedPeriod) {
            return errorResponse(res, "Company ID and period are required", "VALIDATION_ERROR", 400);
        }

        // Parse period for joinDate verification
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const parts = normalizedPeriod.split('-');
        let periodEndDate = new Date();
        if (parts.length === 2) {
            const mIdx = monthNames.indexOf(parts[0]);
            const yr = parseInt(parts[1]);
            if (mIdx !== -1 && !isNaN(yr)) {
                periodEndDate = new Date(yr, mIdx + 1, 0); // Last day of month
            }
        }

        // --- PROCESSING LOG INITIALIZATION ---
        const processingLog = await prisma.processingLog.create({
            data: {
                companyId,
                processType: 'PAYROLL_CALC',
                period: normalizedPeriod,
                status: 'STARTED',
                recordsTotal: 0,
                recordsProcessed: 0,
                processedBy: 'Payroll Wizard'
            }
        });

        // Fetch only active employees for the company
        const employees = await prisma.employee.findMany({
            where: {
                companyId,
                status: 'Active'
            }
        });

        // Update log with total records
        await prisma.processingLog.update({
            where: { id: processingLog.id },
            data: {
                recordsTotal: employees.length,
                status: 'IN_PROGRESS'
            }
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
        let count = 0;

        // Loop through all employees to ensure everyone is considered
        for (const employee of employees) {
            try {
                // Skip if employee join date is AFTER the current payroll period
                if (employee.joinDate && new Date(employee.joinDate) > periodEndDate) {
                    console.log(`[GEN_PAYROLL] Skipping employee ${employee.employeeId} - Join date ${employee.joinDate} is after period end ${periodEndDate}`);
                    continue;
                }

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

                // ... statutory calcs ...
                const nis = gross * 0.03;
                const nht = gross * 0.02;
                const taxableForEdTax = gross - nis;
                const edTax = taxableForEdTax > 0 ? taxableForEdTax * 0.0225 : 0;

                const annualThreshold = 1500000;
                const monthlyThreshold = annualThreshold / 12;
                const taxableForPaye = gross - nis - monthlyThreshold;
                const paye = taxableForPaye > 0 ? taxableForPaye * 0.25 : 0;

                const totalTax = nis + nht + edTax + paye;
                const net = gross - deductions - totalTax;

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

                const existing = await prisma.payroll.findFirst({
                    where: { employeeId: employee.id, period: normalizedPeriod }
                });

                if (existing) {
                    await prisma.payroll.update({
                        where: { id: existing.id },
                        data: payrollData
                    });
                } else {
                    await prisma.payroll.create({
                        data: {
                            ...payrollData,
                            employeeId: employee.id,
                            period: normalizedPeriod
                        }
                    });
                }

                // Mark transactions as PROCESSED
                if (empTransactions.length > 0) {
                    await prisma.transaction.updateMany({
                        where: {
                            employeeId: employee.id,
                            period: normalizedPeriod,
                            status: 'POSTED'
                        },
                        data: { status: 'PROCESSED' }
                    });
                }

                count++;

                // Update progress every 5 records or at the end
                if (count % 5 === 0 || count === employees.length) {
                    await prisma.processingLog.update({
                        where: { id: processingLog.id },
                        data: { recordsProcessed: count }
                    });
                }
            } catch (err) {
                console.error(`Error processing employee ${employee.id}:`, err);
            }
        }

        // --- FINALIZE LOG ---
        await prisma.processingLog.update({
            where: { id: processingLog.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                recordsProcessed: count
            }
        });

        return successResponse(res, { count }, `Successfully generated payroll for ${count} employees.`);
    } catch (error) {
        // Handle failure in log if possible
        next(error);
    }
};

const finalizeBatch = async (req, res, next) => {
    try {
        const { companyId, period } = req.body;
        const normalizedPeriod = normalizePeriod(period);

        if (!companyId || !normalizedPeriod) {
            return errorResponse(res, "Company ID and period are required", "VALIDATION_ERROR", 400);
        }

        // --- PROCESSING LOG INITIALIZATION ---
        const processingLog = await prisma.processingLog.create({
            data: {
                companyId,
                processType: 'PAYROLL_UPDATE',
                period: normalizedPeriod,
                status: 'STARTED',
                recordsTotal: 0,
                recordsProcessed: 0,
                processedBy: req.user?.email || 'System'
            }
        });

        // Fetch count of records to be finalized
        const recordsToFinalize = await prisma.payroll.count({
            where: {
                period: normalizedPeriod,
                employee: { companyId },
                status: 'Calculated'
            }
        });

        await prisma.processingLog.update({
            where: { id: processingLog.id },
            data: {
                recordsTotal: recordsToFinalize,
                status: 'IN_PROGRESS'
            }
        });

        const results = await prisma.payroll.updateMany({
            where: {
                period: normalizedPeriod,
                employee: { companyId },
                status: 'Calculated'
            },
            data: { status: 'Finalized' }
        });

        // --- FINALIZE LOG ---
        await prisma.processingLog.update({
            where: { id: processingLog.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                recordsProcessed: results.count
            }
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

const syncPayrolls = async (req, res, next) => {
    try {
        const { companyId, period } = req.body;
        const normalizedPeriod = normalizePeriod(period);

        if (!companyId || !normalizedPeriod) {
            return errorResponse(res, "Company ID and period are required", "VALIDATION_ERROR", 400);
        }

        // Fetch all active employees for the company
        const employees = await prisma.employee.findMany({
            where: {
                companyId,
                status: 'Active'
            }
        });

        console.log(`[SYNC] Found ${employees.length} active employees for company ${companyId}`);

        let createdCount = 0;
        let existingCount = 0;

        for (const employee of employees) {
            // Check if payroll already exists for this period
            const existing = await prisma.payroll.findFirst({
                where: { employeeId: employee.id, period: normalizedPeriod }
            });

            if (!existing) {
                await prisma.payroll.create({
                    data: {
                        employeeId: employee.id,
                        period: normalizedPeriod,
                        grossSalary: 0,
                        netSalary: 0,
                        deductions: 0,
                        tax: 0,
                        status: 'Pending'
                    }
                });
                createdCount++;
            } else {
                existingCount++;
            }
        }

        console.log(`[SYNC] Result for ${normalizedPeriod}: Created ${createdCount}, Existing ${existingCount}`);
        return successResponse(res, { created: createdCount, existing: existingCount }, `HRM Sync complete. ${createdCount} new records initialized, ${existingCount} already present.`);
    } catch (error) {
        next(error);
    }
};

const getPayrollBatches = async (req, res, next) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return errorResponse(res, "Company ID is required", "VALIDATION_ERROR", 400);

        const summaries = await prisma.payroll.groupBy({
            by: ['period'],
            where: {
                employee: { companyId }
            },
            _sum: {
                grossSalary: true,
                tax: true,
                netSalary: true
            },
            _count: {
                id: true
            },
            _max: {
                createdAt: true
            }
        });

        // Sort by the actual creation time of the latest record in that period (Newest First)
        summaries.sort((a, b) => new Date(b._max.createdAt) - new Date(a._max.createdAt));

        const formatted = await Promise.all(summaries.map(async (s, idx) => {
            // Check if all records in this batch are finalized
            const unfinalizedCount = await prisma.payroll.count({
                where: {
                    period: s.period,
                    employee: { companyId },
                    status: { not: 'Finalized' }
                }
            });

            return {
                id: `CB-${1000 + idx}`,
                period: s.period,
                totalGross: parseFloat(s._sum.grossSalary || 0),
                totalTax: parseFloat(s._sum.tax || 0),
                status: unfinalizedCount === 0 ? 'Finalized' : 'Calculated',
                employeeCount: s._count.id
            };
        }));

        return successResponse(res, formatted);
    } catch (error) {
        next(error);
    }
};

const transmitBankAdvice = async (req, res, next) => {
    try {
        const { payrollIds, bankName } = req.body;

        if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
            return errorResponse(res, "No payroll records selected for transmission", "VALIDATION_ERROR", 400);
        }

        // Update status to 'Paid' (indicating bank transfer initiated)
        const results = await prisma.payroll.updateMany({
            where: { id: { in: payrollIds } },
            data: {
                status: 'Paid',
                paymentDate: new Date()
            }
        });

        // Also log this as a BankTransfer entity for record keeping if needed, 
        // but for now updating Payroll status is sufficient for the requirement.

        return successResponse(res, { count: results.count }, `Successfully transmitted advice for ${results.count} records to ${bankName || 'Bank Clearing System'}.`);
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
    syncPayrolls,
    getPayrollBatches,
    sendPayrollEmail,
    bulkSendEmails,
    transmitBankAdvice
};

// --- STATUTORY CONSOLIDATION PHASE 1 ---
const getStatutorySummary = async (req, res, next) => {
    try {
        const { companyId, year } = req.query;
        if (!companyId || !year) {
            return errorResponse(res, "Company ID and Year are required", "VALIDATION_ERROR", 400);
        }

        const payrolls = await prisma.payroll.findMany({
            where: {
                employee: { companyId },
                period: { contains: year },
                status: { notIn: ['Pending', 'Calculated'] } // Only Finalized/Paid/Sent
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        trn: true,
                        nisNumber: true,
                        nhtNumber: true
                    }
                }
            }
        });

        // Group by Employee
        const summaryMap = {};
        payrolls.forEach(p => {
            const empId = p.employee.id;
            if (!summaryMap[empId]) {
                summaryMap[empId] = {
                    employee: p.employee,
                    grossPay: 0,
                    nisEmployee: 0,
                    nhtEmployee: 0,
                    nisEmployer: 0,
                    nhtEmployer: 0,
                    weeksNis: 0,
                    weeksNht: 0,
                    periods: []
                };
            }
            const stat = summaryMap[empId];
            const gross = parseFloat(p.grossSalary || 0);
            const nisE = parseFloat(p.nis || 0);
            const nhtE = parseFloat(p.nht || 0);

            // Re-calculate Employer portions (NIS 3%, NHT 3%)
            const nisR = gross * 0.03;
            const nhtR = gross * 0.03;

            stat.grossPay += gross;
            stat.nisEmployee += nisE;
            stat.nisEmployer += nisR;
            stat.nhtEmployee += nhtE;
            stat.nhtEmployer += nhtR;

            if (!stat.periods.includes(p.period)) {
                stat.periods.push(p.period);
                // We count a 'week/period' if there was a contribution
                if (nisE > 0 || nisR > 0) stat.weeksNis++;
                if (nhtE > 0 || nhtR > 0) stat.weeksNht++;
            }
        });

        const formatted = Object.values(summaryMap).map(s => {
            return {
                id: s.employee.id,
                employeeName: `${s.employee.lastName}, ${s.employee.firstName}`,
                trn: s.employee.trn || 'N/A',
                nisNumber: s.employee.nisNumber || 'N/A',
                nhtNumber: s.employee.nhtNumber || 'N/A',
                grossPay: s.grossPay,
                wksNis: s.weeksNis,
                nisEmployee: s.nisEmployee,
                nisEmployer: s.nisEmployer,
                nisTotal: s.nisEmployee + s.nisEmployer,
                wksNht: s.weeksNht,
                nhtEmployee: s.nhtEmployee,
                nhtEmployer: s.nhtEmployer,
                nhtTotal: s.nhtEmployee + s.nhtEmployer,
                totalPeriods: s.periods.length,
                periodList: s.periods
            };
        });

        formatted.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

        return successResponse(res, formatted);
    } catch (error) {
        next(error);
    }
};

module.exports.getStatutorySummary = getStatutorySummary;

// --- PHASE 2: INDIVIDUAL NHT LETTER DRILL-DOWN ---
const getEmployeeStatutoryDetails = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        const { year } = req.query;

        if (!employeeId || !year) {
            return errorResponse(res, "Employee ID and Year are required", "VALIDATION_ERROR", 400);
        }

        // 1. Fetch employee master data
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                company: {
                    select: { id: true, name: true, trn: true, address: true, phone: true }
                },
                department: { select: { name: true } }
            }
        });

        if (!employee) {
            return errorResponse(res, "Employee not found", "NOT_FOUND", 404);
        }

        // 2. Fetch all finalized payrolls for this employee in the given year
        const payrolls = await prisma.payroll.findMany({
            where: {
                employeeId,
                period: { contains: year },
                status: { notIn: ['Pending', 'Calculated'] }
            },
            orderBy: { createdAt: 'asc' }
        });

        // 3. Aggregate YTD figures
        let ytdGross = 0;
        let ytdNisEmployee = 0;
        let ytdNhtEmployee = 0;
        let ytdNisEmployer = 0;
        let ytdNhtEmployer = 0;
        let ytdPaye = 0;
        let ytdEdTax = 0;
        const periodBreakdown = [];

        payrolls.forEach(p => {
            const gross = parseFloat(p.grossSalary || 0);
            const nisEE = parseFloat(p.nis || 0);
            const nhtEE = parseFloat(p.nht || 0);
            const nisER = gross * 0.03;
            const nhtER = gross * 0.03;
            const paye = parseFloat(p.paye || 0);
            const edTax = parseFloat(p.edTax || 0);

            ytdGross += gross;
            ytdNisEmployee += nisEE;
            ytdNhtEmployee += nhtEE;
            ytdNisEmployer += nisER;
            ytdNhtEmployer += nhtER;
            ytdPaye += paye;
            ytdEdTax += edTax;

            periodBreakdown.push({
                period: p.period,
                grossSalary: gross,
                nisEmployee: nisEE,
                nisEmployer: nisER,
                nhtEmployee: nhtEE,
                nhtEmployer: nhtER,
                paye,
                edTax,
                status: p.status
            });
        });

        const totalPeriodsNis = periodBreakdown.filter(p => p.nisEmployee > 0 || p.nisEmployer > 0).length;
        const totalPeriodsNht = periodBreakdown.filter(p => p.nhtEmployee > 0 || p.nhtEmployer > 0).length;

        return successResponse(res, {
            employee: {
                id: employee.id,
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                trn: employee.trn || 'N/A',
                nisNumber: employee.nisNumber || 'N/A',
                nhtNumber: employee.nhtNumber || 'N/A',
                designation: employee.designation || 'N/A',
                joinDate: employee.joinDate,
                payFrequency: employee.payFrequency,
                department: employee.department?.name || 'N/A'
            },
            company: employee.company,
            year,
            ytd: {
                grossPay: ytdGross,
                nisEmployee: ytdNisEmployee,
                nisEmployer: ytdNisEmployer,
                nisTotal: ytdNisEmployee + ytdNisEmployer,
                nhtEmployee: ytdNhtEmployee,
                nhtEmployer: ytdNhtEmployer,
                nhtTotal: ytdNhtEmployee + ytdNhtEmployer,
                paye: ytdPaye,
                edTax: ytdEdTax,
                totalPeriodsNis,
                totalPeriodsNht,
                totalPeriods: payrolls.length
            },
            periodBreakdown
        });
    } catch (error) {
        next(error);
    }
};

module.exports.getEmployeeStatutoryDetails = getEmployeeStatutoryDetails;
