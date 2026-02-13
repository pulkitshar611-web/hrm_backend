const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const log = await prisma.auditLog.create({
            data: {
                action: 'TEST_ACTION',
                entity: 'TEST_ENTITY',
                details: 'Test details',
                ipAddress: '127.0.0.1',
                userAgent: 'Test Agent',
                metadata: { test: true }
            }
        });
        console.log('Successfully created log:', log);
    } catch (e) {
        console.error('Failed to create log with new fields:', e);
    }
}

main().finally(() => prisma.$disconnect());
