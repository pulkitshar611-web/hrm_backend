const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const companies = await prisma.company.findMany();
        console.log('Companies:', companies.map(c => ({ id: c.id, name: c.name })));

        if (companies.length > 0) {
            const gangs = await prisma.gang.findMany({
                where: { companyId: companies[0].id }
            });
            console.log(`Gangs for company ${companies[0].id}:`, gangs);
        }

        const allGangs = await prisma.gang.findMany();
        console.log('All Gangs in DB:', allGangs);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
