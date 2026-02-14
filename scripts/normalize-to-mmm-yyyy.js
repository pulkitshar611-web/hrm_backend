const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function normalize(period) {
    if (!period) return period;

    // Check if it's already in the target format: JAN-2026 (3 letters uppercase, hyphen, 4 digits)
    if (/^[A-Z]{3}-\d{4}$/.test(period)) return period;

    const months = {
        '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR', '05': 'MAY', '06': 'JUN',
        '07': 'JUL', '08': 'AUG', '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC',
        'jan': 'JAN', 'feb': 'FEB', 'mar': 'MAR', 'apr': 'APR', 'may': 'MAY', 'jun': 'JUN',
        'jul': 'JUL', 'aug': 'AUG', 'sep': 'SEP', 'oct': 'OCT', 'nov': 'NOV', 'dec': 'DEC',
        'january': 'JAN', 'february': 'FEB', 'march': 'MAR', 'april': 'APR', 'june': 'JUN',
        'july': 'JUL', 'august': 'AUG', 'september': 'SEP', 'october': 'OCT', 'november': 'NOV', 'december': 'DEC'
    };

    // Handle YYYY-MM (e.g. 2026-01)
    const yyyyMm = period.match(/^(\d{4})-(\d{2})$/);
    if (yyyyMm) {
        const year = yyyyMm[1];
        const month = yyyyMm[2];
        if (months[month]) {
            return `${months[month]}-${year}`;
        }
    }

    // Handle Month-YYYY or MMM-YYYY (e.g. Feb-2026, january-2026)
    const parts = period.split(/[ -]/); // Split by space or hyphen
    if (parts.length === 2) {
        const monthPart = parts[0].toLowerCase();
        const yearPart = parts[1];

        const mmm = months[monthPart] || months[monthPart.substring(0, 3)];
        if (mmm && /^\d{4}$/.test(yearPart)) {
            return `${mmm}-${yearPart}`;
        }
    }

    return period;
}

async function main() {
    console.log('--- Starting Period Normalization (to MMM-YYYY) ---');

    // 1. Update Payroll Records
    const payrolls = await prisma.payroll.findMany({
        select: { id: true, period: true }
    });

    console.log(`Checking ${payrolls.length} payroll records...`);
    let payrollUpdates = 0;
    for (const p of payrolls) {
        const normalized = await normalize(p.period);
        if (normalized !== p.period) {
            await prisma.payroll.update({
                where: { id: p.id },
                data: { period: normalized }
            });
            payrollUpdates++;
        }
    }
    console.log(`Updated ${payrollUpdates} payroll records.`);

    // 2. Update Transaction Records
    const transactions = await prisma.transaction.findMany({
        select: { id: true, period: true }
    });

    console.log(`Checking ${transactions.length} transaction records...`);
    let transUpdates = 0;
    for (const t of transactions) {
        const normalized = await normalize(t.period);
        if (normalized !== t.period) {
            await prisma.transaction.update({
                where: { id: t.id },
                data: { period: normalized }
            });
            transUpdates++;
        }
    }
    console.log(`Updated ${transUpdates} transaction records.`);

    // 3. Update ProcessingLogs
    const logs = await prisma.processingLog.findMany({
        select: { id: true, period: true }
    });

    console.log(`Checking ${logs.length} processing logs...`);
    let logUpdates = 0;
    for (const l of logs) {
        const normalized = await normalize(l.period);
        if (normalized !== l.period) {
            await prisma.processingLog.update({
                where: { id: l.id },
                data: { period: normalized }
            });
            logUpdates++;
        }
    }
    console.log(`Updated ${logUpdates} processing log records.`);

    console.log('--- Normalization Complete ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
