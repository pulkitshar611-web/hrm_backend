const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get all gangs for a company
const getGangs = async (req, res, next) => {
    try {
        const { companyId } = req.query;
        if (!companyId) {
            return errorResponse(res, "Company ID is required", "VALIDATION_ERROR", 400);
        }

        const gangs = await prisma.gang.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });

        return successResponse(res, gangs);
    } catch (error) {
        next(error);
    }
};

// Get gang shift assignments for a specific date and company
const getAssignments = async (req, res, next) => {
    try {
        const { companyId, date, shiftType, gangId } = req.query;
        if (!companyId || !date) {
            return errorResponse(res, "Company ID and Date are required", "VALIDATION_ERROR", 400);
        }

        const searchDate = new Date(date);
        searchDate.setHours(0, 0, 0, 0);

        // Fetch all employees for the company first to ensure we show everyone
        const employees = await prisma.employee.findMany({
            where: { companyId },
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                designation: true,
                status: true
            }
        });

        // Fetch assignments for the given date
        const assignments = await prisma.gangShiftAssignment.findMany({
            where: {
                companyId,
                date: searchDate
            },
            include: {
                gang: true
            }
        });

        // Map assignments to employees
        const data = employees.map(emp => {
            const assignment = assignments.find(a => a.employeeId === emp.id);
            return {
                id: emp.id,
                empId: emp.employeeId,
                name: `${emp.firstName} ${emp.lastName}`,
                role: emp.designation || 'Staff',
                status: emp.status,
                gang: assignment ? assignment.gang.name : 'Unassigned',
                gangId: assignment ? assignment.gangId : null,
                shift: assignment ? assignment.shiftType : 'Day Shift',
                assignmentId: assignment ? assignment.id : null
            };
        });

        // Filter by gang or shift if provided
        let filteredData = data;
        if (gangId && gangId !== 'all') {
             filteredData = filteredData.filter(d => d.gangId === gangId);
        }
        if (shiftType && shiftType !== 'all') {
            filteredData = filteredData.filter(d => d.shift === shiftType);
        }

        return successResponse(res, filteredData);
    } catch (error) {
        next(error);
    }
};

// Save assignments (upsert)
const saveAssignments = async (req, res, next) => {
    try {
        const { companyId, date, assignments } = req.body;
        if (!companyId || !date || !Array.isArray(assignments)) {
            return errorResponse(res, "Invalid payload", "VALIDATION_ERROR", 400);
        }

        const saveDate = new Date(date);
        saveDate.setHours(0, 0, 0, 0);

        // We use a transaction to ensure atomicity
        const results = await prisma.$transaction(
            assignments.map(a => {
                const data = {
                    companyId,
                    employeeId: a.employeeId,
                    gangId: a.gangId,
                    shiftType: a.shiftType,
                    date: saveDate
                };

                return prisma.gangShiftAssignment.upsert({
                    where: {
                        employeeId_date: {
                            employeeId: a.employeeId,
                            date: saveDate
                        }
                    },
                    update: {
                        gangId: a.gangId,
                        shiftType: a.shiftType
                    },
                    create: data
                });
            })
        );

        return successResponse(res, results, "Assignments saved successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getGangs,
    getAssignments,
    saveAssignments
};
