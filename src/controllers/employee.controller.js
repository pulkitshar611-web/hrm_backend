const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const getEmployees = async (req, res, next) => {
    try {
        const { companyId } = req.query;
        const employees = await prisma.employee.findMany({
            where: companyId ? { companyId } : {},
            include: {
                department: true,
                company: true
            },
            orderBy: { lastName: 'asc' }
        });
        return successResponse(res, employees);
    } catch (error) {
        next(error);
    }
};

const createEmployee = async (req, res, next) => {
    try {
        const d = req.body;

        if (!d.employeeId || !d.firstName || !d.lastName || !d.companyId) {
            return errorResponse(res, "Missing required fields (employeeId, firstName, lastName, companyId)", "VALIDATION_ERROR", 400);
        }

        const clean = (val) => (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') ? null : val);

        const employeeData = {
            employeeId: d.employeeId,
            firstName: d.firstName,
            lastName: d.lastName,
            middleName: clean(d.middleName),
            email: clean(d.email),
            phone: clean(d.phone),
            dob: (d.dob && typeof d.dob === 'string' && d.dob.trim()) ? new Date(d.dob) : null,
            gender: clean(d.gender),
            maritalStatus: clean(d.maritalStatus),
            street: clean(d.street),
            parish: clean(d.parish),
            city: clean(d.city),
            designation: clean(d.designation),
            joinDate: (d.joinDate && typeof d.joinDate === 'string' && d.joinDate.trim()) ? new Date(d.joinDate) : null,
            status: d.status || 'Active',
            employmentType: d.employmentType || 'Full-Time',
            payFrequency: d.payFrequency || 'Monthly',
            paymentMethod: d.paymentMethod || 'Bank Transfer',
            bankName: clean(d.bankName),
            bankAccount: clean(d.bankAccount),
            salaryType: d.salaryType || 'Salaried',
            baseSalary: parseFloat(d.baseSalary) || 0,
            hourlyRate: parseFloat(d.hourlyRate) || 0,
            lunchAllowance: parseFloat(d.lunchAllowance) || 0,
            travelAllowance: parseFloat(d.travelAllowance) || 0,
            healthInsurance: parseFloat(d.healthInsurance) || 0,
            pensionPercent: parseFloat(d.pensionPercent) || 0,
            unionDues: parseFloat(d.unionDues) || 0,
            trn: clean(d.trn),
            nisNumber: clean(d.nisNumber),
            nhtNumber: clean(d.nhtNumber),
            companyId: d.companyId,
            departmentId: (d.department && d.department !== '' && d.department !== 'Select...') ? d.department : null
        };

        const employee = await prisma.employee.create({
            data: employeeData
        });
        return successResponse(res, employee, "Employee created successfully", 201);
    } catch (error) {
        next(error);
    }
};

const updateEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const d = req.body;

        const clean = (val) => (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') ? null : val);

        const employeeData = {
            employeeId: d.employeeId,
            firstName: d.firstName,
            lastName: d.lastName,
            middleName: clean(d.middleName),
            email: clean(d.email),
            phone: clean(d.phone),
            dob: (d.dob && typeof d.dob === 'string' && d.dob.trim()) ? new Date(d.dob) : null,
            gender: clean(d.gender),
            maritalStatus: clean(d.maritalStatus),
            street: clean(d.street),
            parish: clean(d.parish),
            city: clean(d.city),
            designation: clean(d.designation),
            joinDate: (d.joinDate && typeof d.joinDate === 'string' && d.joinDate.trim()) ? new Date(d.joinDate) : null,
            status: d.status || 'Active',
            employmentType: d.employmentType || 'Full-Time',
            payFrequency: d.payFrequency || 'Monthly',
            paymentMethod: d.paymentMethod || 'Bank Transfer',
            bankName: clean(d.bankName),
            bankAccount: clean(d.bankAccount),
            salaryType: d.salaryType || 'Salaried',
            baseSalary: parseFloat(d.baseSalary) || 0,
            hourlyRate: parseFloat(d.hourlyRate) || 0,
            lunchAllowance: parseFloat(d.lunchAllowance) || 0,
            travelAllowance: parseFloat(d.travelAllowance) || 0,
            healthInsurance: parseFloat(d.healthInsurance) || 0,
            pensionPercent: parseFloat(d.pensionPercent) || 0,
            unionDues: parseFloat(d.unionDues) || 0,
            trn: clean(d.trn),
            nisNumber: clean(d.nisNumber),
            nhtNumber: clean(d.nhtNumber),
            departmentId: (d.department && d.department !== '' && d.department !== 'Select...') ? d.department : null
        };

        const employee = await prisma.employee.update({
            where: { id },
            data: employeeData
        });
        return successResponse(res, employee, "Employee updated successfully");
    } catch (error) {
        next(error);
    }
};

const deleteEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.employee.delete({ where: { id } });
        return successResponse(res, null, "Employee deleted successfully");
    } catch (error) {
        next(error);
    }
};

const bulkUpdateEmployees = async (req, res, next) => {
    try {
        const { updates } = req.body; // Expecting array of { id, data }

        if (!Array.isArray(updates) || updates.length === 0) {
            return errorResponse(res, "No updates provided", "VALIDATION_ERROR", 400);
        }

        const results = [];
        const errors = [];

        for (const update of updates) {
            try {
                const { id, ...data } = update;
                if (!id) continue;

                const employee = await prisma.employee.update({
                    where: { id },
                    data: data
                });
                results.push(employee);
            } catch (err) {
                errors.push({ id: update.id, error: err.message });
            }
        }

        return successResponse(res, { results, errors }, `Updated ${results.length} employees`);
    } catch (error) {
        next(error);
    }
};

module.exports = { getEmployees, createEmployee, updateEmployee, deleteEmployee, bulkUpdateEmployees };
