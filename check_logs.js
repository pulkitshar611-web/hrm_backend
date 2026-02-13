const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.auditLog.count();
    console.log('Total Audit Logs:', count);
    const logs = await prisma.auditLog.findMany({ take: 5 });
    console.log('Sample Logs:', JSON.stringify(logs, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
