const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get all transactions with filters
const getTransactions = async (req, res, next) => {
    try {
        const { companyId, employeeId, period, status, type } = req.query;
        const where = {};

        if (employeeId) where.employeeId = employeeId;
        if (period) where.period = period;
        if (status) where.status = status;
        if (type) where.type = type;
        if (companyId) {
            where.companyId = companyId;
        }

        const transactions = await prisma.transaction.findMany({
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
            orderBy: { transactionDate: 'desc' }
        });

        return successResponse(res, transactions);
    } catch (error) {
        next(error);
    }
};

// Get single transaction
const getTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                employee: true,
                company: true
            }
        });

        if (!transaction) {
            return errorResponse(res, "Transaction not found", "NOT_FOUND", 404);
        }

        return successResponse(res, transaction);
    } catch (error) {
        next(error);
    }
};

// Create transaction
const createTransaction = async (req, res, next) => {
    try {
        const data = req.body;

        if (!data.companyId || !data.employeeId || !data.transactionDate || !data.type || !data.code || !data.amount) {
            return errorResponse(res, "Missing required fields", "VALIDATION_ERROR", 400);
        }

        // Look up employee by their employeeId field (e.g., "EMP001")
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });

        if (!employee) {
            return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
        }

        const transaction = await prisma.transaction.create({
            data: {
                companyId: data.companyId,
                employeeId: employee.id, // Use the UUID from the employee record
                transactionDate: new Date(data.transactionDate),
                type: data.type,
                code: data.code,
                description: data.description || '',
                amount: parseFloat(data.amount),
                units: data.units ? parseFloat(data.units) : null,
                rate: data.rate ? parseFloat(data.rate) : null,
                status: data.status || 'ENTERED',
                period: data.period,
                enteredBy: data.enteredBy || 'SYSTEM',
                enteredAt: new Date()
            },
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, transaction, "Transaction created successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Update transaction
const updateTransaction = async (req, res, next) => {
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

        if (data.transactionDate !== undefined) updateData.transactionDate = new Date(data.transactionDate);
        if (data.type !== undefined) updateData.type = data.type;
        if (data.code !== undefined) updateData.code = data.code;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
        if (data.units !== undefined) updateData.units = data.units ? parseFloat(data.units) : null;
        if (data.rate !== undefined) updateData.rate = data.rate ? parseFloat(data.rate) : null;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.period !== undefined) updateData.period = data.period;

        const transaction = await prisma.transaction.update({
            where: { id },
            data: updateData,
            include: {
                employee: true,
                company: true
            }
        });

        return successResponse(res, transaction, "Transaction updated successfully");
    } catch (error) {
        next(error);
    }
};

// Delete transaction
const deleteTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.transaction.delete({
            where: { id }
        });

        return successResponse(res, null, "Transaction deleted successfully");
    } catch (error) {
        next(error);
    }
};

// Bulk create transactions
const bulkCreateTransactions = async (req, res, next) => {
    try {
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return errorResponse(res, "Invalid transactions array", "VALIDATION_ERROR", 400);
        }

        const createdTransactions = [];
        const errors = [];

        for (let i = 0; i < transactions.length; i++) {
            const data = transactions[i];

            try {
                // Look up employee by their employeeId field
                const employee = await prisma.employee.findUnique({
                    where: { employeeId: data.employeeId }
                });

                if (!employee) {
                    errors.push({ index: i, error: `Employee ${data.employeeId} not found` });
                    continue;
                }

                const transaction = await prisma.transaction.create({
                    data: {
                        companyId: data.companyId,
                        employeeId: employee.id,
                        transactionDate: new Date(data.transactionDate),
                        type: data.type,
                        code: data.code,
                        description: data.description || '',
                        amount: parseFloat(data.amount),
                        units: data.units ? parseFloat(data.units) : null,
                        rate: data.rate ? parseFloat(data.rate) : null,
                        status: data.status || 'ENTERED',
                        period: data.period,
                        enteredBy: data.enteredBy || 'SYSTEM',
                        enteredAt: new Date()
                    }
                });

                createdTransactions.push(transaction);
            } catch (err) {
                errors.push({ index: i, error: err.message });
            }
        }

        return successResponse(res, {
            created: createdTransactions.length,
            total: transactions.length,
            transactions: createdTransactions,
            errors: errors
        }, "Bulk transaction creation completed");
    } catch (error) {
        next(error);
    }
};

// Post transactions (ENTERED -> POSTED)
const postTransactions = async (req, res, next) => {
    try {
        const { transactionIds, postedBy } = req.body;

        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            return errorResponse(res, "Invalid transaction IDs", "VALIDATION_ERROR", 400);
        }

        const posted = await prisma.transaction.updateMany({
            where: {
                id: { in: transactionIds },
                status: 'ENTERED'
            },
            data: {
                status: 'POSTED',
                postedAt: new Date(),
                postedBy: postedBy || 'SYSTEM'
            }
        });

        return successResponse(res, { count: posted.count }, `${posted.count} transactions posted successfully`);
    } catch (error) {
        next(error);
    }
};

// Get transaction register (grouped by status)
const getTransactionRegister = async (req, res, next) => {
    try {
        const { companyId, period, status } = req.query;
        const where = {};

        if (companyId) where.companyId = companyId;
        if (period) where.period = period;
        if (status) where.status = status;

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                employee: {
                    select: {
                        employeeId: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { transactionDate: 'desc' }
            ]
        });

        // Group by status
        const grouped = transactions.reduce((acc, transaction) => {
            if (!acc[transaction.status]) {
                acc[transaction.status] = [];
            }
            acc[transaction.status].push(transaction);
            return acc;
        }, {});

        return successResponse(res, {
            transactions,
            grouped,
            summary: {
                total: transactions.length,
                entered: grouped.ENTERED?.length || 0,
                posted: grouped.POSTED?.length || 0,
                processed: grouped.PROCESSED?.length || 0
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    bulkCreateTransactions,
    postTransactions,
    getTransactionRegister
};
