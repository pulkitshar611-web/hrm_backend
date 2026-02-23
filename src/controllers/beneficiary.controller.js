const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get all beneficiaries for a company
const getBeneficiaries = async (req, res, next) => {
    try {
        const { companyId } = req.query;
        if (!companyId) {
            return errorResponse(res, "Company ID is required", "VALIDATION_ERROR", 400);
        }

        const beneficiaries = await prisma.beneficiary.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });

        return successResponse(res, beneficiaries);
    } catch (error) {
        next(error);
    }
};

// Create a new beneficiary
const createBeneficiary = async (req, res, next) => {
    try {
        const { companyId, name, accountNumber } = req.body;

        if (!companyId || !name || !accountNumber) {
            return errorResponse(res, "Company ID, Name, and Account Number are required", "VALIDATION_ERROR", 400);
        }

        const beneficiary = await prisma.beneficiary.create({
            data: req.body
        });

        return successResponse(res, beneficiary, "Beneficiary created successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Update a beneficiary
const updateBeneficiary = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const beneficiary = await prisma.beneficiary.update({
            where: { id },
            data: data
        });

        return successResponse(res, beneficiary, "Beneficiary updated successfully");
    } catch (error) {
        next(error);
    }
};

// Delete a beneficiary
const deleteBeneficiary = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.beneficiary.delete({
            where: { id }
        });

        return successResponse(res, null, "Beneficiary deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBeneficiaries,
    createBeneficiary,
    updateBeneficiary,
    deleteBeneficiary
};
