require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting master-level seed process...");
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 1. Company
    const company = await prisma.company.upsert({
        where: { code: 'C001' },
        update: {},
        create: {
            name: 'Island HR Solutions',
            code: 'C001',
            address: '123 Main St, Kingston, Jamaica',
            phone: '876-555-0100',
            email: 'contact@islandhr.com',
            bankName: 'Scotiabank (BNS)',
            bankAccount: '90021-34982',
            payFrequency: 'Monthly'
        }
    });

    // 2. Departments
    const deptNames = ['ACCOUNTING', 'OPERATIONS', 'SALES', 'IT / MIS', 'HUMAN RESOURCES'];
    for (const name of deptNames) {
        await prisma.department.upsert({
            where: { name },
            update: {},
            create: { name }
        });
    }
    const allDepts = await prisma.department.findMany();

    // 3. Employees (Professional Baseline Data)
    const empData = [
        { id: 'PW-1001', fn: 'DAVID', ln: 'WILSON', dept: 'ACCOUNTING', sal: 165000, bank: 'BNS', acc: '827101', des: 'FINANCE LEAD', city: 'KINGSTON HQ', freq: 'MONTHLY' },
        { id: 'PW-1002', fn: 'SARAH', ln: 'JOHNSON', dept: 'OPERATIONS', sal: 245000, bank: 'NCB', acc: '109283', des: 'OPS COORDINATOR', city: 'MONTEGO BAY', freq: 'MONTHLY' },
        { id: 'PW-1003', fn: 'MICHAEL', ln: 'CHEN', dept: 'IT / MIS', sal: 195000, bank: 'BNS', acc: '662091', des: 'SYSTEMS ARCHITECT', city: 'KINGSTON HQ', freq: 'MONTHLY' }
    ];

    for (const e of empData) {
        await prisma.employee.upsert({
            where: { employeeId: e.id },
            update: {
                designation: e.des,
                city: e.city,
                payFrequency: e.freq,
                baseSalary: e.sal
            },
            create: {
                employeeId: e.id,
                firstName: e.fn,
                lastName: e.ln,
                email: `${e.fn.toLowerCase()}.${e.ln.toLowerCase()}@islandhr.com`,
                companyId: company.id,
                departmentId: allDepts.find(d => d.name === e.dept)?.id,
                baseSalary: e.sal,
                bankName: e.bank,
                bankAccount: e.acc,
                status: 'Active',
                designation: e.des,
                city: e.city,
                payFrequency: e.freq
            }
        });
    }
    const allEmps = await prisma.employee.findMany();

    // 4. Staged Advance Payment (for immediate visualization)
    const firstEmp = await prisma.employee.findFirst({ where: { employeeId: 'PW-1001' } });
    if (firstEmp) {
        await prisma.advancePayment.upsert({
            where: {
                id: 'seed-adv-1' // Stable ID for seeding
            },
            update: {},
            create: {
                id: 'seed-adv-1',
                companyId: company.id,
                employeeId: firstEmp.id,
                amount: 25000,
                reason: 'Emergency Medical Expense',
                status: 'PENDING',
                requestDate: new Date(),
                installments: 3,
                deductionStart: 'MAR-2026'
            }
        });
    }

    // 5. Users
    const password = await bcrypt.hash('admin123', 10);

    // 1. Admin
    await prisma.user.upsert({
        where: { email: 'admin@islandhr.com' },
        update: { password: password, role: 'ADMIN' },
        create: { username: 'Super Admin', email: 'admin@islandhr.com', password: password, role: 'ADMIN' }
    });

    // 2. HR Manager
    await prisma.user.upsert({
        where: { email: 'hr@islandhr.com' },
        update: { password: password, role: 'HR_MANAGER', companyId: company.id },
        create: { username: 'HR Manager', email: 'hr@islandhr.com', password: password, role: 'HR_MANAGER', companyId: company.id }
    });

    // 3. Finance
    await prisma.user.upsert({
        where: { email: 'finance@islandhr.com' },
        update: { password: password, role: 'FINANCE', companyId: company.id },
        create: { username: 'Finance Officer', email: 'finance@islandhr.com', password: password, role: 'FINANCE', companyId: company.id }
    });

    // 4. Staff
    await prisma.user.upsert({
        where: { email: 'staff@islandhr.com' },
        update: { password: password, role: 'STAFF', companyId: company.id },
        create: { username: 'General Staff', email: 'staff@islandhr.com', password: password, role: 'STAFF', companyId: company.id }
    });

    console.log("Master Seed Completed 🚀");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
