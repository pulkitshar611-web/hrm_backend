const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get all cheques with filters
const getCheques = async (req, res, next) => {
    try {
        const { companyId, employeeId, status, startDate, endDate } = req.query;
        const where = {};

        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;
        if (companyId) where.companyId = companyId;

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const cheques = await prisma.cheque.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        email: true
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
            orderBy: { date: 'desc' }
        });

        return successResponse(res, cheques);
    } catch (error) {
        next(error);
    }
};

// Get single cheque
const getCheque = async (req, res, next) => {
    try {
        const { id } = req.params;

        const cheque = await prisma.cheque.findUnique({
            where: { id },
            include: {
                employee: true,
                company: true
            }
        });

        if (!cheque) {
            return errorResponse(res, "Cheque not found", "NOT_FOUND", 404);
        }

        return successResponse(res, cheque);
    } catch (error) {
        next(error);
    }
};

// Create cheque
const createCheque = async (req, res, next) => {
    try {
        const data = req.body;

        if (!data.companyId || !data.chequeNumber || !data.amount || !data.payee) {
            return errorResponse(res, "Missing required fields", "VALIDATION_ERROR", 400);
        }

        let employee = null;
        if (data.employeeId) {
            // Look up employee by their employeeId field
            employee = await prisma.employee.findUnique({
                where: { employeeId: data.employeeId }
            });

            if (!employee) {
                return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
            }
        }

        // Check if cheque number already exists
        const existingCheque = await prisma.cheque.findUnique({
            where: { chequeNumber: data.chequeNumber }
        });

        if (existingCheque) {
            return errorResponse(res, "Cheque number already exists", "DUPLICATE", 400);
        }

        const cheque = await prisma.cheque.create({
            data: {
                companyId: data.companyId,
                employeeId: employee ? employee.id : null,
                chequeNumber: data.chequeNumber,
                amount: parseFloat(data.amount),
                payee: data.payee,
                date: data.date ? new Date(data.date) : new Date(),
                bankAccount: data.bankAccount || '',
                status: data.status || 'PENDING'
            },
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, cheque, "Cheque created successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Update cheque
const updateCheque = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const updateData = {};

        if (data.employeeId) {
            const employee = await prisma.employee.findUnique({
                where: { employeeId: data.employeeId }
            });
            if (!employee) {
                return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
            }
            updateData.employeeId = employee.id;
        } else if (data.employeeId === null) {
            updateData.employeeId = null;
        }

        if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
        if (data.payee !== undefined) updateData.payee = data.payee;
        if (data.date !== undefined) updateData.date = new Date(data.date);
        if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount;
        if (data.status !== undefined) updateData.status = data.status;

        const cheque = await prisma.cheque.update({
            where: { id },
            data: updateData,
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, cheque, "Cheque updated successfully");
    } catch (error) {
        next(error);
    }
};

// Print cheques (mark as printed)
const printCheques = async (req, res, next) => {
    try {
        const { chequeIds, printedBy } = req.body;

        if (!Array.isArray(chequeIds) || chequeIds.length === 0) {
            return errorResponse(res, "Invalid cheque IDs", "VALIDATION_ERROR", 400);
        }

        const printed = await prisma.cheque.updateMany({
            where: {
                id: { in: chequeIds },
                status: 'PENDING'
            },
            data: {
                status: 'PRINTED',
                printedAt: new Date(),
                printedBy: printedBy || 'SYSTEM'
            }
        });

        return successResponse(res, { count: printed.count }, `${printed.count} cheques marked as printed`);
    } catch (error) {
        next(error);
    }
};

// Void cheque
const voidCheque = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { voidReason } = req.body;

        if (!voidReason) {
            return errorResponse(res, "Void reason is required", "VALIDATION_ERROR", 400);
        }

        const cheque = await prisma.cheque.update({
            where: { id },
            data: {
                status: 'VOID',
                voidedAt: new Date(),
                voidReason: voidReason
            },
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, cheque, "Cheque voided successfully");
    } catch (error) {
        next(error);
    }
};

// Get cheque print history
const getChequeHistory = async (req, res, next) => {
    try {
        const { companyId, startDate, endDate } = req.query;
        const where = {
            status: { in: ['PRINTED', 'ISSUED', 'CLEARED', 'VOID', 'PENDING'] }
        };

        if (companyId) where.companyId = companyId;

        if (startDate || endDate) {
            where.printedAt = {};
            if (startDate) where.printedAt.gte = new Date(startDate);
            if (endDate) where.printedAt.lte = new Date(endDate);
        }

        const cheques = await prisma.cheque.findMany({
            where,
            include: {
                employee: {
                    select: {
                        employeeId: true,
                        firstName: true,
                        lastName: true
                    }
                },
                company: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const summary = {
            total: cheques.length,
            printed: cheques.filter(c => c.status === 'PRINTED').length,
            issued: cheques.filter(c => c.status === 'ISSUED').length,
            cleared: cheques.filter(c => c.status === 'CLEARED').length,
            voided: cheques.filter(c => c.status === 'VOID').length,
            totalAmount: cheques.reduce((sum, c) => sum + parseFloat(c.amount), 0)
        };

        return successResponse(res, { cheques, summary });
    } catch (error) {
        next(error);
    }
};

// Delete cheque (only if PENDING)
const deleteCheque = async (req, res, next) => {
    try {
        const { id } = req.params;

        const cheque = await prisma.cheque.findUnique({
            where: { id }
        });

        if (!cheque) {
            return errorResponse(res, "Cheque not found", "NOT_FOUND", 404);
        }

        if (cheque.status !== 'PENDING') {
            return errorResponse(res, "Only pending cheques can be deleted", "INVALID_STATUS", 400);
        }

        await prisma.cheque.delete({
            where: { id }
        });

        return successResponse(res, null, "Cheque deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCheques,
    getCheque,
    createCheque,
    updateCheque,
    printCheques,
    voidCheque,
    getChequeHistory,
    deleteCheque
};
