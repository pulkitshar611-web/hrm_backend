const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Universal Seed Utility...");

    // Get all companies
    const companies = await prisma.company.findMany();
    console.log(`Found ${companies.length} companies to seed.`);

    for (const company of companies) {
        console.log(`- Seeding ${company.name} (${company.code})...`);

        // Check for departments
        let depts = await prisma.department.findMany();
        if (depts.length === 0) {
            await prisma.department.createMany({
                data: [
                    { name: 'ACCOUNTING' },
                    { name: 'OPERATIONS' },
                    { name: 'SALES' },
                    { name: 'IT / MIS' }
                ]
            });
            depts = await prisma.department.findMany();
        }

        // Check for employees in this company
        const empCount = await prisma.employee.count({ where: { companyId: company.id } });
        if (empCount === 0) {
            console.log(`  Creating employees...`);
            await prisma.employee.createMany({
                data: [
                    {
                        employeeId: `EMP-${company.code}-01`,
                        firstName: 'JOHN',
                        lastName: 'DOE',
                        email: `john.doe@${company.code.toLowerCase()}.com`,
                        companyId: company.id,
                        departmentId: depts[0].id,
                        baseSalary: 150000,
                        bankName: 'BNS',
                        bankAccount: '123456',
                        status: 'Active'
                    },
                    {
                        employeeId: `EMP-${company.code}-02`,
                        firstName: 'JANE',
                        lastName: 'SMITH',
                        email: `jane.smith@${company.code.toLowerCase()}.com`,
                        companyId: company.id,
                        departmentId: depts[1].id,
                        baseSalary: 250000,
                        bankName: 'NCB',
                        bankAccount: '654321',
                        status: 'Active'
                    }
                ]
            });
        }

        const employees = await prisma.employee.findMany({ where: { companyId: company.id } });

        // Check for transactions
        const txCount = await prisma.transaction.count({ where: { companyId: company.id } });
        if (txCount === 0) {
            console.log(`  Creating transactions...`);
            await prisma.transaction.createMany({
                data: [
                    {
                        companyId: company.id,
                        employeeId: employees[0].id,
                        transactionDate: new Date(),
                        type: 'EARNING',
                        code: 'BSAL',
                        description: 'Monthly Salary',
                        amount: 150000,
                        units: 1,
                        rate: 150000,
                        status: 'POSTED',
                        period: 'Feb-2026',
                        enteredBy: 'system@hrm.com'
                    },
                    {
                        companyId: company.id,
                        employeeId: employees[1].id,
                        transactionDate: new Date(),
                        type: 'ALLOWANCE',
                        code: 'HOUS',
                        description: 'Housing Allowance',
                        amount: 25000,
                        units: 1,
                        rate: 25000,
                        status: 'ENTERED',
                        period: 'Feb-2026',
                        enteredBy: 'system@hrm.com'
                    }
                ]
            });
        }

        // Check for processing logs
        const logCount = await prisma.processingLog.count({ where: { companyId: company.id } });
        if (logCount === 0) {
            await prisma.processingLog.create({
                data: {
                    companyId: company.id,
                    processType: 'TRANS_POST',
                    period: 'Feb-2026',
                    status: 'COMPLETED',
                    recordsTotal: 2,
                    recordsProcessed: 2,
                    processedBy: 'system@hrm.com',
                    startedAt: new Date(),
                    completedAt: new Date()
                }
            });
        }
    }

    console.log("Universal Seed Utility completed.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
