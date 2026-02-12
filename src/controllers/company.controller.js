const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const getCompanies = async (req, res, next) => {
    try {
        const companies = await prisma.company.findMany();
        return successResponse(res, companies);
    } catch (error) {
        next(error);
    }
};

const createCompany = async (req, res, next) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) {
            return errorResponse(res, "Name and code are required", "VALIDATION_ERROR", 400);
        }
        const company = await prisma.company.create({
            data: req.body
        });
        return successResponse(res, company, "Company created successfully", 201);
    } catch (error) {
        next(error);
    }
};

const updateCompany = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const company = await prisma.company.update({
            where: { id },
            data: data
        });

        return successResponse(res, company, "Company updated successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = { getCompanies, createCompany, updateCompany };
