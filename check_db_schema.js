const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRaw`SHOW COLUMNS FROM auditlog`;
        console.log('Columns in auditlog table:', columns);
    } catch (e) {
        console.error('Failed to get columns:', e);
    }
}

main().finally(() => prisma.$disconnect());
