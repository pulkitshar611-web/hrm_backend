const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const getAttendance = async (req, res, next) => {
    try {
        const { date, companyId } = req.query;
        const where = {};
        if (date) where.date = new Date(date);
        if (companyId) {
            where.employee = { companyId };
        }

        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                employee: true
            },
            orderBy: { date: 'desc' }
        });
        return successResponse(res, attendance);
    } catch (error) {
        next(error);
    }
};

const createAttendance = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.employeeId || !data.date) {
            return errorResponse(res, "Employee ID and date are required", "VALIDATION_ERROR", 400);
        }

        // Look up employee by their employeeId field (e.g., "EMP001")
        const employee = await prisma.employee.findUnique({
            where: { employeeId: data.employeeId }
        });

        if (!employee) {
            return errorResponse(res, `Employee with ID ${data.employeeId} not found`, "NOT_FOUND", 404);
        }

        const attendance = await prisma.attendance.create({
            data: {
                employeeId: employee.id, // Use the UUID from the employee record
                date: new Date(data.date),
                checkIn: data.checkIn || null,
                checkOut: data.checkOut || null,
                hours: parseFloat(data.hours || 0),
                status: data.status || 'Present',
                remarks: data.remarks || null
            },
            include: { employee: true }
        });
        return successResponse(res, attendance, "Attendance recorded successfully", 201);
    } catch (error) {
        next(error);
    }
};

const updateAttendance = async (req, res, next) => {
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

        if (data.date !== undefined) updateData.date = new Date(data.date);
        if (data.checkIn !== undefined) updateData.checkIn = data.checkIn || null;
        if (data.checkOut !== undefined) updateData.checkOut = data.checkOut || null;
        if (data.hours !== undefined) updateData.hours = parseFloat(data.hours);
        if (data.status !== undefined) updateData.status = data.status;
        if (data.remarks !== undefined) updateData.remarks = data.remarks || null;

        const attendance = await prisma.attendance.update({
            where: { id },
            data: updateData,
            include: { employee: true }
        });
        return successResponse(res, attendance, "Attendance updated successfully");
    } catch (error) {
        next(error);
    }
};

const deleteAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.attendance.delete({ where: { id } });
        return successResponse(res, null, "Attendance record deleted");
    } catch (error) {
        next(error);
    }
};

module.exports = { getAttendance, createAttendance, updateAttendance, deleteAttendance };
