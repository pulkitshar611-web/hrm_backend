const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const transactionCodes = [
    { code: 'BSAL', name: 'Basic Salary', type: 'EARNING' },
    { code: 'OT15', name: 'Overtime 1.5x', type: 'EARNING' },
    { code: 'OT20', name: 'Overtime 2.0x', type: 'EARNING' },
    { code: 'TRAV', name: 'Travel Allowance', type: 'ALLOWANCE' },
    { code: 'LUNC', name: 'Lunch Allowance', type: 'ALLOWANCE' },
    { code: 'PAYE', name: 'Income Tax (PAYE)', type: 'DEDUCTION' },
    { code: 'NHT', name: 'NHT Contribution', type: 'DEDUCTION' },
    { code: 'NIS', name: 'NIS Contribution', type: 'DEDUCTION' },
    { code: 'LOAN', name: 'Loan Deduction', type: 'DEDUCTION' },
    { code: 'BONU', name: 'Performance Bonus', type: 'EARNING' }
];

async function main() {
    console.log('Seeding transaction codes...');
    
    for (const tc of transactionCodes) {
        await prisma.transactionCode.upsert({
            where: { code: tc.code },
            update: {},
            create: {
                code: tc.code,
                name: tc.name,
                type: tc.type,
                description: `Standard ${tc.name}`
            }
        });
    }
    
    console.log('Transaction codes seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
