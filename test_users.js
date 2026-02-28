require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { company: true }
    });
    
    const employees = await prisma.employee.findMany({
        include: { company: true }
    });
    
    fs.writeFileSync('test_out2.json', JSON.stringify({
       users: users.map(u => ({ email: u.email, role: u.role, companyId: u.companyId, companyName: u.company?.name })),
       employees: employees.map(e => ({ email: e.email, firstName: e.firstName, companyId: e.companyId, companyName: e.company?.name }))
    }, null, 2), 'utf8');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
