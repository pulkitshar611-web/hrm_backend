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
        { id: 'EMP101', fn: 'JOHN', ln: 'DOE', dept: 'ACCOUNTING', sal: 155000, bank: 'BNS', acc: '001234' },
        { id: 'EMP102', fn: 'SARAH', ln: 'SMITH', dept: 'OPERATIONS', sal: 285000, bank: 'NCB', acc: '998877' },
        { id: 'EMP204', fn: 'MIKE', ln: 'ROSS', dept: 'IT / MIS', sal: 195000, bank: 'BNS', acc: '445566' },
        { id: 'EMP305', fn: 'RACHEL', ln: 'ZANE', dept: 'SALES', sal: 210000, bank: 'JN', acc: '112233' },
        { id: 'EMP205', fn: 'PETER', ln: 'PARKER', dept: 'IT / MIS', sal: 165000, bank: 'NCB', acc: '881122' },
        { id: 'EMP103', fn: 'BRUCE', ln: 'WAYNE', dept: 'OPERATIONS', sal: 450000, bank: 'JMMB', acc: '774411' },
        { id: 'EMP306', fn: 'CLARK', ln: 'KENT', dept: 'SALES', sal: 180000, bank: 'BNS', acc: '223344' },
        { id: 'EMP401', fn: 'DIANA', ln: 'PRINCE', dept: 'HUMAN RESOURCES', sal: 230000, bank: 'SAGICOR', acc: '990011' },
        { id: 'EMP104', fn: 'TONY', ln: 'STARK', dept: 'ACCOUNTING', sal: 350000, bank: 'CITIBANK', acc: '556677' },
        { id: 'EMP105', fn: 'NATASHA', ln: 'ROMANOFF', dept: 'OPERATIONS', sal: 215000, bank: 'BNS', acc: '334455' },
        { id: 'EMP402', fn: 'STEVE', ln: 'ROGERS', dept: 'HUMAN RESOURCES', sal: 190000, bank: 'NCB', acc: '667788' }
    ];

    for (const e of empData) {
        await prisma.employee.upsert({
            where: { employeeId: e.id },
            update: {},
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
                status: 'Active'
            }
        });
    }
    const allEmps = await prisma.employee.findMany();

    // 4. Transactions (ENTERED)
    console.log("Creating Entry Stream...");
    await prisma.transaction.createMany({
        data: [
            { companyId: company.id, employeeId: allEmps[0].id, transactionDate: new Date(), type: 'EARNING', code: 'BSAL', description: 'Basic Salary', amount: 77500, units: 1, rate: 77500, status: 'ENTERED', period: 'Feb-2026', enteredBy: 'admin@islandhr.com' },
            { companyId: company.id, employeeId: allEmps[1].id, transactionDate: new Date(), type: 'EARNING', code: 'COMM', description: 'Monthly Commission', amount: 45000, units: 1, rate: 45000, status: 'ENTERED', period: 'Feb-2026', enteredBy: 'admin@islandhr.com' }
        ]
    });

    // 5. Payrolls (For Cheque/Bank integration testing)
    console.log("Seeding Payroll Batches...");
    await prisma.payroll.createMany({
        data: [
            { employeeId: allEmps[0].id, period: 'Jan-2026', grossSalary: 155000, netSalary: 124000, deductions: 31000, tax: 23250, status: 'Approved' },
            { employeeId: allEmps[1].id, period: 'Jan-2026', grossSalary: 285000, netSalary: 228000, deductions: 57000, tax: 42750, status: 'Approved' },
            { employeeId: allEmps[2].id, period: 'Jan-2026', grossSalary: 195000, netSalary: 156000, deductions: 39000, tax: 29250, status: 'Approved' }
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
