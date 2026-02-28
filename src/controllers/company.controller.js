const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const getCompanies = async (req, res, next) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;
        const userEmail = req.user.email;

        // ADMIN users see all companies
        if (userRole === 'ADMIN') {
            const companies = await prisma.company.findMany();
            return successResponse(res, companies);
        }

        // Non-admin users see only their assigned company
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { company: true }
        });

        if (user && user.company) {
            return successResponse(res, [user.company]);
        }

        // Fallback: If User record doesn't have a company, check Employee records by email
        const employee = await prisma.employee.findFirst({
            where: { email: userEmail },
            include: { company: true }
        });

        if (employee && employee.company) {
            return successResponse(res, [employee.company]);
        }

        return successResponse(res, []);
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

const uploadLogo = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return errorResponse(res, "No file uploaded", "VALIDATION_ERROR", 400);
        }

        const logoUrl = `/uploads/company-logos/${req.file.filename}`;

        const company = await prisma.company.update({
            where: { id },
            data: { logo: logoUrl }
        });

        return successResponse(res, company, "Logo uploaded successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = { getCompanies, createCompany, updateCompany, uploadLogo };
