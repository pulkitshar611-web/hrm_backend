const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get current processing status
const getProcessingStatus = async (req, res, next) => {
    try {
        const { companyId } = req.query;
        const where = {};

        if (companyId) where.companyId = companyId;

        // Get recent processing logs
        const recentLogs = await prisma.processingLog.findMany({
            where: {
                ...where,
                status: { in: ['STARTED', 'IN_PROGRESS'] }
            },
            include: {
                company: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { startedAt: 'desc' },
            take: 10
        });

        // Get completed logs from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const completedLogs = await prisma.processingLog.findMany({
            where: {
                ...where,
                status: { in: ['COMPLETED', 'FAILED'] },
                completedAt: { gte: yesterday }
            },
            include: {
                company: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { completedAt: 'desc' },
            take: 20
        });

        const summary = {
            active: recentLogs.length,
            completedToday: completedLogs.filter(l => l.status === 'COMPLETED').length,
            failedToday: completedLogs.filter(l => l.status === 'FAILED').length
        };

        return successResponse(res, {
            activeProcesses: recentLogs,
            recentCompleted: completedLogs,
            summary
        });
    } catch (error) {
        next(error);
    }
};

// Start a new process
const startProcess = async (req, res, next) => {
    try {
        const { companyId, processType, period, recordsTotal, processedBy } = req.body;

        if (!companyId || !processType || !period) {
            return errorResponse(res, "Missing required fields", "VALIDATION_ERROR", 400);
        }

        const validProcessTypes = ['TRANSACTION_POST', 'PAYROLL_CALC', 'PAYROLL_UPDATE', 'PAYMENT_PROCESS'];
        if (!validProcessTypes.includes(processType)) {
            return errorResponse(res, "Invalid process type", "VALIDATION_ERROR", 400);
        }

        const processingLog = await prisma.processingLog.create({
            data: {
                companyId,
                processType,
                period,
                status: 'STARTED',
                recordsTotal: recordsTotal || 0,
                recordsProcessed: 0,
                processedBy: processedBy || 'SYSTEM',
                startedAt: new Date()
            },
            include: {
                company: true
            }
        });

        return successResponse(res, processingLog, "Process started successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Update process progress
const updateProcessProgress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { recordsProcessed, status, errorMessage } = req.body;

        const updateData = {};

        if (recordsProcessed !== undefined) updateData.recordsProcessed = recordsProcessed;
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'COMPLETED' || status === 'FAILED') {
                updateData.completedAt = new Date();
            }
        }
        if (errorMessage !== undefined) updateData.errorMessage = errorMessage;

        const processingLog = await prisma.processingLog.update({
            where: { id },
            data: updateData,
            include: {
                company: true
            }
        });

        return successResponse(res, processingLog, "Process progress updated");
    } catch (error) {
        next(error);
    }
};

// Get processing logs with filters
const getProcessingLogs = async (req, res, next) => {
    try {
        const { companyId, processType, status, period, startDate, endDate } = req.query;
        const where = {};

        if (companyId) where.companyId = companyId;
        if (processType) where.processType = processType;
        if (status) where.status = status;
        if (period) where.period = period;

        if (startDate || endDate) {
            where.startedAt = {};
            if (startDate) where.startedAt.gte = new Date(startDate);
            if (endDate) where.startedAt.lte = new Date(endDate);
        }

        const logs = await prisma.processingLog.findMany({
            where,
            include: {
                company: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { startedAt: 'desc' }
        });

        const summary = {
            total: logs.length,
            started: logs.filter(l => l.status === 'STARTED').length,
            inProgress: logs.filter(l => l.status === 'IN_PROGRESS').length,
            completed: logs.filter(l => l.status === 'COMPLETED').length,
            failed: logs.filter(l => l.status === 'FAILED').length
        };

        return successResponse(res, { logs, summary });
    } catch (error) {
        next(error);
    }
};

// Get single processing log
const getProcessingLog = async (req, res, next) => {
    try {
        const { id } = req.params;

        const log = await prisma.processingLog.findUnique({
            where: { id },
            include: {
                company: true
            }
        });

        if (!log) {
            return errorResponse(res, "Processing log not found", "NOT_FOUND", 404);
        }

        return successResponse(res, log);
    } catch (error) {
        next(error);
    }
};

// Delete old processing logs (cleanup)
const cleanupOldLogs = async (req, res, next) => {
    try {
        const { daysOld } = req.body;
        const days = daysOld || 90; // Default 90 days

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const deleted = await prisma.processingLog.deleteMany({
            where: {
                status: { in: ['COMPLETED', 'FAILED'] },
                completedAt: { lt: cutoffDate }
            }
        });

        return successResponse(res, { count: deleted.count }, `Deleted ${deleted.count} old processing logs`);
    } catch (error) {
        next(error);
    }
};

// Get processing statistics
const getProcessingStatistics = async (req, res, next) => {
    try {
        const { companyId, startDate, endDate } = req.query;
        const where = {};

        if (companyId) where.companyId = companyId;

        if (startDate || endDate) {
            where.startedAt = {};
            if (startDate) where.startedAt.gte = new Date(startDate);
            if (endDate) where.startedAt.lte = new Date(endDate);
        }

        const logs = await prisma.processingLog.findMany({
            where
        });

        const statistics = {
            totalProcesses: logs.length,
            byType: {
                transactionPost: logs.filter(l => l.processType === 'TRANSACTION_POST').length,
                payrollCalc: logs.filter(l => l.processType === 'PAYROLL_CALC').length,
                payrollUpdate: logs.filter(l => l.processType === 'PAYROLL_UPDATE').length,
                paymentProcess: logs.filter(l => l.processType === 'PAYMENT_PROCESS').length
            },
            byStatus: {
                started: logs.filter(l => l.status === 'STARTED').length,
                inProgress: logs.filter(l => l.status === 'IN_PROGRESS').length,
                completed: logs.filter(l => l.status === 'COMPLETED').length,
                failed: logs.filter(l => l.status === 'FAILED').length
            },
            totalRecordsProcessed: logs.reduce((sum, l) => sum + l.recordsProcessed, 0),
            averageProcessingTime: calculateAverageProcessingTime(logs.filter(l => l.completedAt)),
            successRate: logs.filter(l => l.completedAt).length > 0
                ? (logs.filter(l => l.status === 'COMPLETED').length / logs.filter(l => l.completedAt).length * 100).toFixed(2) + '%'
                : '0%'
        };

        return successResponse(res, statistics);
    } catch (error) {
        next(error);
    }
};

// Helper function to calculate average processing time
function calculateAverageProcessingTime(completedLogs) {
    if (completedLogs.length === 0) return '0 seconds';

    const totalTime = completedLogs.reduce((sum, log) => {
        const duration = new Date(log.completedAt) - new Date(log.startedAt);
        return sum + duration;
    }, 0);

    const avgTime = totalTime / completedLogs.length / 1000; // Convert to seconds

    if (avgTime < 60) return `${avgTime.toFixed(2)} seconds`;
    if (avgTime < 3600) return `${(avgTime / 60).toFixed(2)} minutes`;
    return `${(avgTime / 3600).toFixed(2)} hours`;
}

module.exports = {
    getProcessingStatus,
    startProcess,
    updateProcessProgress,
    getProcessingLogs,
    getProcessingLog,
    cleanupOldLogs,
    getProcessingStatistics
};
