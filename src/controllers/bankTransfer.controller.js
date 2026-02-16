const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get all bank transfers with filters
const getBankTransfers = async (req, res, next) => {
    try {
        const { companyId, employeeId, bankName, status, startDate, endDate } = req.query;
        const where = {};

        if (employeeId) where.employeeId = employeeId;
        if (bankName) where.bankName = bankName;
        if (status) where.status = status;
        if (companyId) where.companyId = companyId;

        if (startDate || endDate) {
            where.transferDate = {};
            if (startDate) where.transferDate.gte = new Date(startDate);
            if (endDate) where.transferDate.lte = new Date(endDate);
        }

        const transfers = await prisma.bankTransfer.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        bankName: true,
                        bankAccount: true
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
            orderBy: { transferDate: 'desc' }
        });

        return successResponse(res, transfers);
    } catch (error) {
        next(error);
    }
};

// Get single bank transfer
const getBankTransfer = async (req, res, next) => {
    try {
        const { id } = req.params;

        const transfer = await prisma.bankTransfer.findUnique({
            where: { id },
            include: {
                employee: true,
                company: true
            }
        });

        if (!transfer) {
            return errorResponse(res, "Bank transfer not found", "NOT_FOUND", 404);
        }

        return successResponse(res, transfer);
    } catch (error) {
        next(error);
    }
};

// Create bank transfer
const createBankTransfer = async (req, res, next) => {
    try {
        const data = req.body;

        if (!data.companyId || !data.employeeId || !data.bankName || !data.accountNumber || !data.amount) {
            return errorResponse(res, "Missing required fields", "VALIDATION_ERROR", 400);
        }

        // Look up employee by their employeeId field
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });

        if (!employee) {
            return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
        }

        const transfer = await prisma.bankTransfer.create({
            data: {
                companyId: data.companyId,
                employeeId: employee.id,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                accountName: data.accountName || `${employee.firstName} ${employee.lastName}`,
                amount: parseFloat(data.amount),
                reference: data.reference || `PAY-${Date.now()}`,
                transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
                status: data.status || 'PENDING',
                batchId: data.batchId || null
            },
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, transfer, "Bank transfer created successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Update bank transfer
const updateBankTransfer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const updateData = {};

        if (data.employeeId !== undefined) {
            const employee = await prisma.employee.findUnique({
                where: { employeeId: data.employeeId }
            });
            if (!employee) {
                return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
            }
            updateData.employeeId = employee.id;
        }

        if (data.bankName !== undefined) updateData.bankName = data.bankName;
        if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber;
        if (data.accountName !== undefined) updateData.accountName = data.accountName;
        if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
        if (data.reference !== undefined) updateData.reference = data.reference;
        if (data.transferDate !== undefined) updateData.transferDate = new Date(data.transferDate);
        if (data.status !== undefined) updateData.status = data.status;

        const transfer = await prisma.bankTransfer.update({
            where: { id },
            data: updateData,
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, transfer, "Bank transfer updated successfully");
    } catch (error) {
        next(error);
    }
};

// Create batch transfer
const createBatchTransfer = async (req, res, next) => {
    try {
        const { transfers, bankName } = req.body;

        if (!Array.isArray(transfers) || transfers.length === 0) {
            return errorResponse(res, "Invalid transfers array", "VALIDATION_ERROR", 400);
        }

        const batchId = `BATCH-${Date.now()}`;
        const createdTransfers = [];
        const errors = [];

        for (let i = 0; i < transfers.length; i++) {
            const data = transfers[i];

            try {
                const employee = await prisma.employee.findUnique({
                    where: { employeeId: data.employeeId }
                });

                if (!employee) {
                    errors.push({ index: i, error: `Employee ${data.employeeId} not found` });
                    continue;
                }

                const transfer = await prisma.bankTransfer.create({
                    data: {
                        companyId: data.companyId,
                        employeeId: employee.id,
                        bankName: bankName || data.bankName,
                        accountNumber: data.accountNumber || employee.bankAccount,
                        accountName: data.accountName || `${employee.firstName} ${employee.lastName}`,
                        amount: parseFloat(data.amount),
                        reference: data.reference || `PAY-${Date.now()}-${i}`,
                        transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
                        status: 'PENDING',
                        batchId: batchId
                    }
                });

                createdTransfers.push(transfer);
            } catch (err) {
                errors.push({ index: i, error: err.message });
            }
        }

        return successResponse(res, {
            batchId,
            created: createdTransfers.length,
            total: transfers.length,
            transfers: createdTransfers,
            errors: errors
        }, "Batch transfer created successfully");
    } catch (error) {
        next(error);
    }
};

// Process bank transfers (mark as processed)
const processBankTransfers = async (req, res, next) => {
    try {
        console.log('[DEBUG] processBankTransfers called with:', JSON.stringify(req.body));
        const { transferIds, companyId, period } = req.body;

        if ((!transferIds || !Array.isArray(transferIds) || transferIds.length === 0) && (!companyId || !period)) {
            console.error('[DEBUG] Validation failed: missing parameters');
            return errorResponse(res, "Invalid request. Missing transferIds or companyId/period.", "VALIDATION_MISMATCH", 400);
        }

        let processedCount = 0;

        if (transferIds && Array.isArray(transferIds) && transferIds.length > 0) {
            const processed = await prisma.bankTransfer.updateMany({
                where: {
                    id: { in: transferIds },
                    status: 'PENDING'
                },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date()
                }
            });
            processedCount = processed.count;
        } else if (companyId && period) {
            // Processing by period (Disburse All Now)

            // 1. Update Payroll records to 'Processed'
            const payrollResults = await prisma.payroll.updateMany({
                where: {
                    period: period,
                    employee: { companyId: companyId },
                    status: 'Finalized'
                },
                data: { status: 'Processed' }
            });

            // 2. Update existing BankTransfer records for this company and period if they exist
            // (Note: Transfer records might be linked to employees of this company)
            const transferResults = await prisma.bankTransfer.updateMany({
                where: {
                    companyId: companyId,
                    status: 'PENDING',
                    // We might need a better way to link transfers to periods if they don't have a period field,
                    // but usually they are created for a specific run.
                },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date()
                }
            });

            processedCount = payrollResults.count;

            // 3. Create a processing log
            await prisma.processingLog.create({
                data: {
                    companyId,
                    processType: 'PAYMENT_PROCESS',
                    period,
                    status: 'COMPLETED',
                    recordsProcessed: processedCount,
                    recordsTotal: processedCount,
                    completedAt: new Date(),
                    processedBy: req.user?.email || 'System'
                }
            });
        }

        return successResponse(res, { count: processedCount }, `${processedCount} transactions processed successfully`);
    } catch (error) {
        next(error);
    }
};

// Export bank file (generate data for bank import)
const exportBankFile = async (req, res, next) => {
    try {
        const { companyId, bankName, batchId, startDate, endDate } = req.query;
        const where = {
            status: 'PENDING'
        };

        if (companyId) where.companyId = companyId;
        if (bankName) where.bankName = bankName;
        if (batchId) where.batchId = batchId;

        if (startDate || endDate) {
            where.transferDate = {};
            if (startDate) where.transferDate.gte = new Date(startDate);
            if (endDate) where.transferDate.lte = new Date(endDate);
        }

        const transfers = await prisma.bankTransfer.findMany({
            where,
            include: {
                employee: {
                    select: {
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        trn: true
                    }
                }
            },
            orderBy: { transferDate: 'asc' }
        });

        // Format data for bank file (CSV format)
        const fileData = transfers.map(t => ({
            accountNumber: t.accountNumber,
            accountName: t.accountName,
            amount: parseFloat(t.amount).toFixed(2),
            reference: t.reference,
            employeeId: t.employee.employeeId,
            trn: t.employee.trn || ''
        }));

        const summary = {
            totalTransfers: transfers.length,
            totalAmount: transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0),
            bankName: bankName || 'ALL',
            exportDate: new Date()
        };

        return successResponse(res, {
            transfers: fileData,
            summary
        });
    } catch (error) {
        next(error);
    }
};

// Delete bank transfer (only if PENDING)
const deleteBankTransfer = async (req, res, next) => {
    try {
        const { id } = req.params;

        const transfer = await prisma.bankTransfer.findUnique({
            where: { id }
        });

        if (!transfer) {
            return errorResponse(res, "Bank transfer not found", "NOT_FOUND", 404);
        }

        if (transfer.status !== 'PENDING') {
            return errorResponse(res, "Only pending transfers can be deleted", "INVALID_STATUS", 400);
        }

        await prisma.bankTransfer.delete({
            where: { id }
        });

        return successResponse(res, null, "Bank transfer deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBankTransfers,
    getBankTransfer,
    createBankTransfer,
    updateBankTransfer,
    createBatchTransfer,
    processBankTransfers,
    exportBankFile,
    deleteBankTransfer
};
