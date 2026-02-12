const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSalesShareAndBulkUpdate() {
    try {
        console.log('--- Starting Sales Share & Bulk Update Verification ---');

        const company = await prisma.company.findFirst({ where: { employees: { some: {} } } });
        if (!company) {
            console.error('No company with employees found.');
            process.exit(1);
        }
        const companyId = company.id;
        const employee = await prisma.employee.findFirst({ where: { companyId } });
        const employeeId = employee.id;

        console.log(`Using Company ID: ${companyId}`);
        console.log(`Using Employee ID: ${employeeId}`);

        // 1. Test Bulk Update
        console.log('\n1. Testing Bulk Update...');
        const bulkPayload = {
            updates: [
                {
                    id: employeeId,
                    baseSalary: 125000.50
                }
            ]
        };
        const bulkRes = await makeRequest('PUT', '/api/employees/bulk-update', bulkPayload);
        console.log('Bulk Update Response:', JSON.stringify(bulkRes, null, 2));

        // 2. Test Sales Share GET
        console.log('\n2. Testing GET /api/sales-share...');
        const period = 'Feb 2025';
        const salesGetRes = await makeRequest('GET', `/api/sales-share?companyId=${companyId}&period=${encodeURIComponent(period)}`);
        console.log('Sales Share GET Response count:', salesGetRes.data.length);

        // 3. Test Sales Share POST
        console.log('\n3. Testing POST /api/sales-share...');
        const salesPayload = {
            companyId,
            period,
            salesShares: [
                {
                    employeeId: employeeId,
                    totalSales: 500000,
                    commissionRate: 10,
                    shareAmount: 50000
                }
            ]
        };
        const salesSaveRes = await makeRequest('POST', '/api/sales-share', salesPayload);
        console.log('Sales Share POST Response:', JSON.stringify(salesSaveRes, null, 2));

        if (bulkRes.success && salesSaveRes.success) {
            console.log('\n--- All Verifications Successful ---');
        } else {
            console.error('\n--- Verification Failed ---');
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

testSalesShareAndBulkUpdate();
