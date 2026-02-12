const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get all advance payments with filters
const getAdvancePayments = async (req, res, next) => {
    try {
        const { companyId, employeeId, status, startDate, endDate } = req.query;
        const where = {};

        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;
        if (companyId) where.companyId = companyId;

        if (startDate || endDate) {
            where.requestDate = {};
            if (startDate) where.requestDate.gte = new Date(startDate);
            if (endDate) where.requestDate.lte = new Date(endDate);
        }

        const advancePayments = await prisma.advancePayment.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        baseSalary: true
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
            orderBy: { requestDate: 'desc' }
        });

        return successResponse(res, advancePayments);
    } catch (error) {
        next(error);
    }
};

// Get single advance payment
const getAdvancePayment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const advancePayment = await prisma.advancePayment.findUnique({
            where: { id },
            include: {
                employee: true,
                company: true
            }
        });

        if (!advancePayment) {
            return errorResponse(res, "Advance payment not found", "NOT_FOUND", 404);
        }

        return successResponse(res, advancePayment);
    } catch (error) {
        next(error);
    }
};

// Create advance payment request
const createAdvancePayment = async (req, res, next) => {
    try {
        const data = req.body;

        if (!data.companyId || !data.employeeId || !data.amount || !data.reason) {
            return errorResponse(res, "Missing required fields", "VALIDATION_ERROR", 400);
        }

        // Look up employee by their employeeId field
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });

        if (!employee) {
            return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
        }

        // Check if employee has pending advance payments
        const pendingAdvances = await prisma.advancePayment.findMany({
            where: {
                employeeId: employee.id,
                status: { in: ['PENDING', 'APPROVED'] }
            }
        });

        if (pendingAdvances.length > 0) {
            return errorResponse(res, "Employee has pending advance payment requests", "PENDING_REQUEST", 400);
        }

        const advancePayment = await prisma.advancePayment.create({
            data: {
                companyId: data.companyId,
                employeeId: employee.id,
                amount: parseFloat(data.amount),
                reason: data.reason,
                requestDate: data.requestDate ? new Date(data.requestDate) : new Date(),
                status: 'PENDING',
                deductionStart: data.deductionStart || null,
                installments: data.installments || null
            },
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, advancePayment, "Advance payment request created successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Update advance payment
const updateAdvancePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const updateData = {};

        if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
        if (data.reason !== undefined) updateData.reason = data.reason;
        if (data.deductionStart !== undefined) updateData.deductionStart = data.deductionStart;
        if (data.installments !== undefined) updateData.installments = data.installments;

        const advancePayment = await prisma.advancePayment.update({
            where: { id },
            data: updateData,
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, advancePayment, "Advance payment updated successfully");
    } catch (error) {
        next(error);
    }
};

// Approve advance payment
const approveAdvancePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { approvedBy } = req.body;

        const advancePayment = await prisma.advancePayment.findUnique({
            where: { id }
        });

        if (!advancePayment) {
            return errorResponse(res, "Advance payment not found", "NOT_FOUND", 404);
        }

        if (advancePayment.status !== 'PENDING') {
            return errorResponse(res, "Only pending requests can be approved", "INVALID_STATUS", 400);
        }

        const updated = await prisma.advancePayment.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedDate: new Date(),
                approvedBy: approvedBy || 'SYSTEM'
            },
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, updated, "Advance payment approved successfully");
    } catch (error) {
        next(error);
    }
};

// Reject advance payment
const rejectAdvancePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const advancePayment = await prisma.advancePayment.findUnique({
            where: { id }
        });

        if (!advancePayment) {
            return errorResponse(res, "Advance payment not found", "NOT_FOUND", 404);
        }

        if (advancePayment.status !== 'PENDING') {
            return errorResponse(res, "Only pending requests can be rejected", "INVALID_STATUS", 400);
        }

        const updated = await prisma.advancePayment.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reason: rejectionReason ? `${advancePayment.reason} | Rejected: ${rejectionReason}` : advancePayment.reason
            },
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, updated, "Advance payment rejected");
    } catch (error) {
        next(error);
    }
};

// Mark advance payment as paid
const markAsPaid = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { paymentDate } = req.body;

        const advancePayment = await prisma.advancePayment.findUnique({
            where: { id }
        });

        if (!advancePayment) {
            return errorResponse(res, "Advance payment not found", "NOT_FOUND", 404);
        }

        if (advancePayment.status !== 'APPROVED') {
            return errorResponse(res, "Only approved requests can be marked as paid", "INVALID_STATUS", 400);
        }

        const updated = await prisma.advancePayment.update({
            where: { id },
            data: {
                status: 'PAID',
                paymentDate: paymentDate ? new Date(paymentDate) : new Date()
            },
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, updated, "Advance payment marked as paid");
    } catch (error) {
        next(error);
    }
};

// Delete advance payment (only if PENDING or REJECTED)
const deleteAdvancePayment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const advancePayment = await prisma.advancePayment.findUnique({
            where: { id }
        });

        if (!advancePayment) {
            return errorResponse(res, "Advance payment not found", "NOT_FOUND", 404);
        }

        if (!['PENDING', 'REJECTED'].includes(advancePayment.status)) {
            return errorResponse(res, "Only pending or rejected requests can be deleted", "INVALID_STATUS", 400);
        }

        await prisma.advancePayment.delete({
            where: { id }
        });

        return successResponse(res, null, "Advance payment deleted successfully");
    } catch (error) {
        next(error);
    }
};

// Get advance payment summary
const getAdvancePaymentSummary = async (req, res, next) => {
    try {
        const { companyId, employeeId } = req.query;
        const where = {};

        if (companyId) where.companyId = companyId;
        if (employeeId) {
            const employee = await prisma.employee.findUnique({
                where: { employeeId }
            });
            if (employee) where.employeeId = employee.id;
        }

        const advancePayments = await prisma.advancePayment.findMany({
            where
        });

        const summary = {
            total: advancePayments.length,
            pending: advancePayments.filter(a => a.status === 'PENDING').length,
            approved: advancePayments.filter(a => a.status === 'APPROVED').length,
            rejected: advancePayments.filter(a => a.status === 'REJECTED').length,
            paid: advancePayments.filter(a => a.status === 'PAID').length,
            totalAmount: advancePayments.reduce((sum, a) => sum + parseFloat(a.amount), 0),
            pendingAmount: advancePayments.filter(a => a.status === 'PENDING').reduce((sum, a) => sum + parseFloat(a.amount), 0),
            approvedAmount: advancePayments.filter(a => a.status === 'APPROVED').reduce((sum, a) => sum + parseFloat(a.amount), 0),
            paidAmount: advancePayments.filter(a => a.status === 'PAID').reduce((sum, a) => sum + parseFloat(a.amount), 0)
        };

        return successResponse(res, summary);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAdvancePayments,
    getAdvancePayment,
    createAdvancePayment,
    updateAdvancePayment,
    approveAdvancePayment,
    rejectAdvancePayment,
    markAsPaid,
    deleteAdvancePayment,
    getAdvancePaymentSummary
};
