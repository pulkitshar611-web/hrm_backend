const cron = require('node-cron');
const prisma = require('../config/db');

// ─── Accrual Configuration ────────────────────────────────────────────────────
// These defaults run as a monthly accrual on each employee's join-date anniversary.
// Adjust the values below without touching any other file.
const CONFIG = {
    vacationHoursPerMonth: 8,   // Hours of vacation accrued per month
    sickHoursPerMonth: 12,      // Hours of sick leave accrued per month
    vacationCap: 240,           // Maximum vacation balance (hours)
    sickCap: 480,               // Maximum sick balance (hours)
};

/**
 * Runs once daily at 01:00 AM server time.
 * Checks each active employee to see if today is their monthly job-date anniversary.
 * If yes, adds the configured hours to their balances (up to the cap).
 *
 * This function ONLY writes to vacationBalance and sickBalance.
 * It does NOT touch the Leave table, leave requests, or the approval workflow.
 */
const runLeaveAccrual = async () => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1; // 1-indexed

    console.log(`[LeaveAccrual] Running accrual check for ${today.toDateString()}`);

    try {
        // Fetch all active employees who have a join date
        const employees = await prisma.employee.findMany({
            where: {
                status: 'Active',
                joinDate: { not: null }
            },
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                joinDate: true,
                vacationBalance: true,
                sickBalance: true,
            }
        });

        let accrued = 0;

        for (const emp of employees) {
            const joinDay = new Date(emp.joinDate).getDate();

            // Accrue on the same day-of-month as their join date
            if (joinDay !== todayDay) continue;

            const currentVacation = parseFloat(emp.vacationBalance) || 0;
            const currentSick = parseFloat(emp.sickBalance) || 0;

            const newVacation = Math.min(currentVacation + CONFIG.vacationHoursPerMonth, CONFIG.vacationCap);
            const newSick = Math.min(currentSick + CONFIG.sickHoursPerMonth, CONFIG.sickCap);

            // Only update if there's a meaningful change
            if (newVacation === currentVacation && newSick === currentSick) continue;

            await prisma.employee.update({
                where: { id: emp.id },
                data: {
                    vacationBalance: newVacation,
                    sickBalance: newSick,
                }
            });

            console.log(`[LeaveAccrual] Accrued for ${emp.firstName} ${emp.lastName} (${emp.employeeId}): +${CONFIG.vacationHoursPerMonth}h vacation, +${CONFIG.sickHoursPerMonth}h sick`);
            accrued++;
        }

        console.log(`[LeaveAccrual] Done. ${accrued} employee(s) accrued today.`);
    } catch (err) {
        console.error('[LeaveAccrual] Error during accrual:', err.message);
    }
};

/**
 * Start the leave accrual cron job.
 * Runs at 01:00 AM every day.
 */
const startLeaveAccrualJob = () => {
    cron.schedule('0 1 * * *', runLeaveAccrual, {
        timezone: 'America/Jamaica'
    });
    console.log('[LeaveAccrual] Scheduled: runs daily at 1:00 AM Jamaica time.');
};

module.exports = { startLeaveAccrualJob, runLeaveAccrual };
