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

    // 3. Employees
    const empData = [
        { id: 'EMP101', fn: 'JOHN', ln: 'DOE', dept: 'ACCOUNTING', sal: 155000, bank: 'BNS', acc: '001234', des: 'GRADE 1', city: 'Kingston HQ', freq: 'Monthly' },
        { id: 'EMP102', fn: 'SARAH', ln: 'SMITH', dept: 'OPERATIONS', sal: 285000, bank: 'NCB', acc: '998877', des: 'GRADE 2', city: 'Montego Bay', freq: 'Monthly' },
        { id: 'EMP204', fn: 'MIKE', ln: 'ROSS', dept: 'IT / MIS', sal: 195000, bank: 'BNS', acc: '445566', des: 'GRADE 1', city: 'Kingston HQ', freq: 'Monthly' },
        { id: 'EMP205', fn: 'PETER', ln: 'PARKER', dept: 'IT / MIS', sal: 165000, bank: 'NCB', acc: '881122', des: 'GRADE 3', city: 'Kingston HQ', freq: 'Weekly' }
    ];

    for (const e of empData) {
        await prisma.employee.upsert({
            where: { employeeId: e.id },
            update: {
                designation: e.des,
                city: e.city,
                payFrequency: e.freq
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

    // 4. Transactions (ENTERED)
    console.log("Creating Entry Stream...");
    await prisma.transaction.createMany({
        data: [
            { companyId: company.id, employeeId: allEmps[0].id, transactionDate: new Date(), type: 'EARNING', code: 'BSAL', description: 'Basic Salary', amount: 77500, units: 1, rate: 77500, status: 'ENTERED', period: 'Feb-2026', enteredBy: 'admin@islandhr.com' }
        ]
    });

    // 5. Payrolls
    console.log("Seeding Payroll Batches for JAN and FEB...");
    await prisma.payroll.deleteMany({ where: { period: { in: ['Jan-2026', 'Feb-2026'] } } });
    await prisma.payroll.createMany({
        data: [
            // JAN
            { employeeId: allEmps[0].id, period: 'Jan-2026', grossSalary: 155000, netSalary: 124000, deductions: 31000, tax: 23250, status: 'Finalized' },
            // FEB (Matches your filter)
            { employeeId: allEmps[0].id, period: 'Feb-2026', grossSalary: 155000, netSalary: 124000, deductions: 31000, tax: 23250, status: 'Finalized' },
            { employeeId: allEmps[1].id, period: 'Feb-2026', grossSalary: 285000, netSalary: 228000, deductions: 57000, tax: 42750, status: 'Finalized' },
            { employeeId: allEmps[2].id, period: 'Feb-2026', grossSalary: 195000, netSalary: 156000, deductions: 39000, tax: 29250, status: 'Finalized' }
        ]
    });

    // 6. Processing Logs (For Status page)
    console.log("Logging historical activities...");
    await prisma.processingLog.create({
        data: {
            companyId: company.id,
            processType: 'PAYROLL_CALC',
            period: 'Jan-2026',
            status: 'COMPLETED',
            recordsTotal: 4,
            recordsProcessed: 4,
            processedBy: 'admin@islandhr.com',
            startedAt: new Date(Date.now() - 3600000),
            completedAt: new Date()
        }
    });

    // Users
    const adminPass = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({ where: { email: 'admin@islandhr.com' }, update: { password: adminPass }, create: { username: 'admin', email: 'admin@islandhr.com', password: adminPass, role: 'ADMIN' } });

    console.log("Master Seed Completed 🚀");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
