const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Get global system settings
const getSystemSettings = async (req, res, next) => {
    try {
        let systemSettings = await prisma.systemSettings.findUnique({
            where: { id: 'global' }
        });

        // Initialize with defaults if not exists
        if (!systemSettings) {
            const defaultSettings = {
                systemName: 'HRM Payroll Pro',
                language: 'English (US)',
                timezone: 'GMT-5 (Jamaica)',
                dateFormat: 'DD/MM/YYYY',
                currency: 'JMD',
                enableNotifications: true,
                autoBackup: true,
                backupFrequency: 'Daily',
                theme: 'Classic Win98',
                sessionTimeout: '30',
                loginSecurity: 'High',
                passwordExpiry: '90',
                allowMultiFactor: false,
                emailAlerts: true,
                desktopAlerts: true
            };

            systemSettings = await prisma.systemSettings.create({
                data: {
                    id: 'global',
                    settings: defaultSettings
                }
            });
        }

        return successResponse(res, systemSettings.settings);
    } catch (error) {
        next(error);
    }
};

// Update global system settings
const updateSystemSettings = async (req, res, next) => {
    try {
        const { settings } = req.body;

        if (!settings) {
            return errorResponse(res, "Settings object is required", "VALIDATION_ERROR", 400);
        }

        const systemSettings = await prisma.systemSettings.upsert({
            where: { id: 'global' },
            update: { settings },
            create: {
                id: 'global',
                settings
            }
        });

        return successResponse(res, systemSettings.settings, "System settings updated successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSystemSettings,
    updateSystemSettings
};
