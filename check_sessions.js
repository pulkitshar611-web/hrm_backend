const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.refreshToken.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Recent Sessions:', JSON.stringify(sessions, null, 2));
}

main().finally(() => prisma.$disconnect());
