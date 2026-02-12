const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get all bank accounts for a company
const getBankAccounts = async (req, res, next) => {
    try {
        const { companyId } = req.query;

        if (!companyId) {
            return errorResponse(res, "Company ID is required", "VALIDATION_ERROR", 400);
        }

        const bankAccounts = await prisma.bankAccount.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        return successResponse(res, bankAccounts);
    } catch (error) {
        next(error);
    }
};

// Get single bank account
const getBankAccount = async (req, res, next) => {
    try {
        const { id } = req.params;

        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id }
        });

        if (!bankAccount) {
            return errorResponse(res, "Bank account not found", "NOT_FOUND", 404);
        }

        return successResponse(res, bankAccount);
    } catch (error) {
        next(error);
    }
};

// Create bank account
const createBankAccount = async (req, res, next) => {
    try {
        const {
            companyId,
            bankName,
            bankBranch,
            accountNumber,
            identificationNo,
            glAccount,
            exportPath
        } = req.body;

        if (!companyId || !bankBranch || !accountNumber) {
            return errorResponse(res, "Company ID, bank branch, and account number are required", "VALIDATION_ERROR", 400);
        }

        const bankAccount = await prisma.bankAccount.create({
            data: {
                companyId,
                bankName: bankName || '',
                bankBranch,
                accountNumber,
                identificationNo: identificationNo || '',
                glAccount: glAccount || '',
                exportPath: exportPath || ''
            }
        });

        return successResponse(res, bankAccount, "Bank account created successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Update bank account
const updateBankAccount = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            bankName,
            bankBranch,
            accountNumber,
            identificationNo,
            glAccount,
            exportPath,
            isActive
        } = req.body;

        const updateData = {};
        if (bankName !== undefined) updateData.bankName = bankName;
        if (bankBranch !== undefined) updateData.bankBranch = bankBranch;
        if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
        if (identificationNo !== undefined) updateData.identificationNo = identificationNo;
        if (glAccount !== undefined) updateData.glAccount = glAccount;
        if (exportPath !== undefined) updateData.exportPath = exportPath;
        if (isActive !== undefined) updateData.isActive = isActive;

        const bankAccount = await prisma.bankAccount.update({
            where: { id },
            data: updateData
        });

        return successResponse(res, bankAccount, "Bank account updated successfully");
    } catch (error) {
        next(error);
    }
};

// Delete bank account
const deleteBankAccount = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.bankAccount.delete({
            where: { id }
        });

        return successResponse(res, null, "Bank account deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBankAccounts,
    getBankAccount,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount
};
