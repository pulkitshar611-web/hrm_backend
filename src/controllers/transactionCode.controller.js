const { PrismaClient } = require('@prisma/client');
const { successResponse, errorResponse } = require('../utils/response');

const prisma = new PrismaClient();

// Get all transaction codes
const getTransactionCodes = async (req, res, next) => {
    try {
        const { type, isActive } = req.query;
        
        const where = {};
        if (type) where.type = type;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const codes = await prisma.transactionCode.findMany({
            where,
            orderBy: { code: 'asc' }
        });

        return successResponse(res, codes, "Transaction codes retrieved successfully");
    } catch (error) {
        next(error);
    }
};

// Create transaction code
const createTransactionCode = async (req, res, next) => {
    try {
        const { code, name, type, description } = req.body;

        if (!code || !name || !type) {
            return errorResponse(res, "Code, name, and type are required", "VALIDATION_ERROR", 400);
        }

        const newCode = await prisma.transactionCode.create({
            data: { code, name, type, description }
        });

        return successResponse(res, newCode, "Transaction code created successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Update transaction code
const updateTransactionCode = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { code, name, type, description, isActive } = req.body;

        const updated = await prisma.transactionCode.update({
            where: { id },
            data: { code, name, type, description, isActive }
        });

        return successResponse(res, updated, "Transaction code updated successfully");
    } catch (error) {
        next(error);
    }
};

// Delete transaction code
const deleteTransactionCode = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.transactionCode.delete({
            where: { id }
        });

        return successResponse(res, null, "Transaction code deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTransactionCodes,
    createTransactionCode,
    updateTransactionCode,
    deleteTransactionCode
};
