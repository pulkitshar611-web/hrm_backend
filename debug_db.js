const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- DB DEBUG ---');
        const companies = await prisma.company.findMany();
        console.log('Companies:', companies.map(c => ({ id: c.id, name: c.name })));

        const employees = await prisma.employee.findMany();
        console.log('Total Employees:', employees.length);
        console.log('Active Employees:', employees.filter(e => e.status === 'Active').length);

        if (employees.length > 0) {
            console.log('First 3 Employees:', employees.slice(0, 3).map(e => ({
                id: e.id,
                name: e.firstName + ' ' + e.lastName,
                companyId: e.companyId,
                status: e.status
            })));
        }
    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
