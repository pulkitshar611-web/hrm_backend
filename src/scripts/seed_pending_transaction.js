const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Get the first company
        const company = await prisma.company.findFirst();
        if (!company) {
            console.log('No company found. Please create a company first.');
            return;
        }

        // 2. Get the first employee of that company
        const employee = await prisma.employee.findFirst({
            where: { companyId: company.id }
        });

        if (!employee) {
            // If no employee, let's create a dummy one
            console.log('No employee found. Creating a dummy employee first.');
            const newEmployee = await prisma.employee.create({
                data: {
                    employeeId: 'EMP-SAMPLE-001',
                    firstName: 'Sample',
                    lastName: 'User',
                    email: 'sample.user@example.com',
                    companyId: company.id,
                    dateOfBirth: new Date(),
                    hireDate: new Date(),
                    status: 'Active',
                    designation: 'Tester',
                    departmentId: null
                }
            });
            // Try again with this employee
            await createTransaction(company, newEmployee);
            return;
        }

        await createTransaction(company, employee);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

async function createTransaction(company, employee) {
    // 3. Create a pending transaction
    const period = 'Feb-2026'; // ensure match with the period filter on the page
    const transaction = await prisma.transaction.create({
        data: {
            companyId: company.id,
            employeeId: employee.id,
            transactionDate: new Date(),
            type: 'EARNING',
            code: 'BONUS',
            description: 'Performance Bonus (Sample)',
            amount: 5000.00,
            status: 'ENTERED', // This ensures it shows up in 'Post Transactions'
            period: period,
            enteredBy: 'System Admin'
        }
    });

    console.log('Created sample pending transaction:', transaction);
}

main();
