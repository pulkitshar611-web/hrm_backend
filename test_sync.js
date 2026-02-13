const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSync() {
    const companyId = '4fcd1fd1-7dc0-496d-8872-066a37f10dda';
    const period = 'February 2026';

    console.log(`Testing sync for ${companyId} - ${period}`);

    const employees = await prisma.employee.findMany({
        where: { companyId, status: 'Active' }
    });

    console.log(`Found ${employees.length} active employees`);

    for (const emp of employees) {
        const existing = await prisma.payroll.findFirst({
            where: { employeeId: emp.id, period }
        });
        if (!existing) {
            console.log(`Creating payroll for ${emp.firstName} ${emp.lastName}`);
            await prisma.payroll.create({
                data: {
                    employeeId: emp.id,
                    period,
                    grossSalary: 0,
                    netSalary: 0,
                    deductions: 0,
                    tax: 0,
                    status: 'Pending'
                }
            });
        } else {
            console.log(`Payroll exists for ${emp.firstName} ${emp.lastName}`);
        }
    }
}

testSync().finally(() => prisma.$disconnect());
