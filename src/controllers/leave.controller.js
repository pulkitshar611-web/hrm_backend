const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const getLeaves = async (req, res, next) => {
    try {
        const { companyId, employeeId } = req.query;
        const where = {};
        if (employeeId) where.employeeId = employeeId;
        if (companyId) {
            where.employee = { companyId };
        }

        const leaves = await prisma.leave.findMany({
            where,
            include: {
                employee: true
            },
            orderBy: { startDate: 'desc' }
        });
        return successResponse(res, leaves);
    } catch (error) {
        next(error);
    }
};

const createLeave = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.employeeId || !data.startDate || !data.endDate || !data.type) {
            return errorResponse(res, "Missing required fields", "VALIDATION_ERROR", 400);
        }

        // Look up employee by their employeeId field (e.g., "EMP001")
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });

        if (!employee) {
            return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
        }

        const leave = await prisma.leave.create({
            data: {
                employeeId: employee.id, // Use the UUID from the employee record
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                type: data.type,
                status: data.status || 'Pending',
                reason: data.reason || null
            },
            include: { employee: true }
        });
        return successResponse(res, leave, "Leave application submitted", 201);
    } catch (error) {
        next(error);
    }
};

const updateLeave = async (req, res, next) => {
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

        if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
        if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
        if (data.type !== undefined) updateData.type = data.type;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.reason !== undefined) updateData.reason = data.reason || null;

        const leave = await prisma.leave.update({
            where: { id },
            data: updateData,
            include: { employee: true }
        });
        return successResponse(res, leave, "Leave record updated");
    } catch (error) {
        next(error);
    }
};

const deleteLeave = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.leave.delete({ where: { id } });
        return successResponse(res, null, "Leave record deleted");
    } catch (error) {
        next(error);
    }
};

module.exports = { getLeaves, createLeave, updateLeave, deleteLeave };
