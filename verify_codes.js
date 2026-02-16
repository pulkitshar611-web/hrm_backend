const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const codes = await prisma.transactionCode.findMany();
    console.log('--- SEEDED TRANSACTION CODES ---');
    codes.forEach(c => {
        console.log(`[${c.code}] ${c.name} (${c.type}) - ${c.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });
    console.log(`Total: ${codes.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
