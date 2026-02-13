const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function main() {
    console.log("Finding company...");
    const company = await prisma.company.findFirst();
    if (!company) {
        console.error("No company found!");
        return;
    }
    console.log(`Found company: ${company.name} (${company.id})`);

    const postData = JSON.stringify({
        companyId: company.id,
        period: 'Feb-2026'
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/payrolls/generate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log("Triggering Payroll Generation for Feb-2026...");
    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('Request completed.');
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
