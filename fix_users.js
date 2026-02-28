require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fixing missing company assignments...");
    
    // Find a valid company
    const company = await prisma.company.findFirst();
    if (!company) {
        console.log("No companies found in DB.");
        return;
    }
    
    const companyId = company.id;
    console.log(`Assigning users to company: ${company.name} (${companyId})`);

    // Assign companyId to hr, finance, staff users that have null companyId
    const emailsToFix = ["hr@islandhr.com", "finance@islandhr.com", "staff@islandhr.com"];
    
    for (const email of emailsToFix) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && !user.companyId) {
            await prisma.user.update({
                where: { email },
                data: { companyId }
            });
            console.log(`Updated user ${email} with companyId ${companyId}`);
        }
    }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
