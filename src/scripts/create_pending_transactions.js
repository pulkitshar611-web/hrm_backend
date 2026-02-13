const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Pending Transactions for Feb-2026...");

    // 1. Get employees and company
    const company = await prisma.company.findFirst();
    if (!company) {
        console.log("No company found.");
        return;
    }
    const employees = await prisma.employee.findMany({ where: { companyId: company.id } });
    if (employees.length === 0) {
        console.log("No employees found.");
        return;
    }

    // 2. Clear existing ENTERED transactions for this period to avoid duplicates
    const period = 'Feb-2026';
    await prisma.transaction.deleteMany({
        where: {
            companyId: company.id,
            status: 'ENTERED',
            period: period
        }
    });

    // 3. Create Dummy Transactions
    const transactionData = [
        { empIndex: 0, type: 'EARNING', code: 'OT', desc: 'Overtime 10hrs', amount: 5000.00 },
        { empIndex: 0, type: 'DEDUCTION', code: 'LATE', desc: 'Late Arrival Penalty', amount: 500.00 },
        { empIndex: 1, type: 'EARNING', code: 'BONUS', desc: 'Performance Bonus', amount: 15000.00 },
        { empIndex: 1, type: 'ALLOWANCE', code: 'MEAL', desc: 'Meal Allowance', amount: 3000.00 },
        { empIndex: 2, type: 'EARNING', code: 'COMM', desc: 'Sales Commission', amount: 4500.00 },
        { empIndex: 2, type: 'DEDUCTION', code: 'UNIFORM', desc: 'Uniform Fee', amount: 1200.00 },
    ];

    for (const t of transactionData) {
        const emp = employees[t.empIndex % employees.length];
        await prisma.transaction.create({
            data: {
                companyId: company.id,
                employeeId: emp.id,
                transactionDate: new Date(),
                type: t.type,
                code: t.code,
                description: t.desc,
                amount: t.amount,
                status: 'ENTERED',
                period: period,
                enteredBy: 'seed-script',
                enteredAt: new Date()
            }
        });
        console.log(`Created ${t.type} for ${emp.firstName} ${emp.lastName}: $${t.amount}`);
    }

    console.log("Seeding Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
