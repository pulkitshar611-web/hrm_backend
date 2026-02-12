const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGangShift() {
    try {
        console.log('--- Starting Gang Shift API Verification ---');

        // 1. Get a company with employees
        const company = await prisma.company.findFirst({
            where: {
                employees: { some: {} }
            }
        });
        if (!company) {
            console.error('No company found in database.');
            process.exit(1);
        }
        const companyId = company.id;
        console.log(`Using Company ID: ${companyId}`);

        // 2. Fetch Gangs
        console.log('\nTesting GET /api/gang-shift/gangs...');
        const gangsRes = await makeRequest('GET', `/api/gang-shift/gangs?companyId=${companyId}`);
        console.log('Gangs Response:', JSON.stringify(gangsRes, null, 2));

        if (!gangsRes.success || gangsRes.data.length === 0) {
            console.error('Failed to fetch gangs or no gangs found.');
            process.exit(1);
        }
        const gangId = gangsRes.data[0].id;

        // 3. Fetch Assignments
        console.log('\nTesting GET /api/gang-shift/assignments...');
        const date = new Date().toISOString().split('T')[0];
        const assignmentsRes = await makeRequest('GET', `/api/gang-shift/assignments?companyId=${companyId}&date=${date}`);
        console.log('Assignments count:', assignmentsRes.data.length);
        
        if (!assignmentsRes.success) {
            console.error('Failed to fetch assignments.');
            process.exit(1);
        }

        // 4. Save an Assignment
        if (assignmentsRes.data.length > 0) {
            const employeeId = assignmentsRes.data[0].id;
            console.log(`\nTesting POST /api/gang-shift/assignments for Employee ID: ${employeeId}...`);
            
            const payload = {
                companyId,
                date,
                assignments: [
                    {
                        employeeId: employeeId,
                        gangId: gangId,
                        shiftType: 'Night Shift'
                    }
                ]
            };

            const saveRes = await makeRequest('POST', '/api/gang-shift/assignments', payload);
            console.log('Save Response:', JSON.stringify(saveRes, null, 2));

            if (saveRes.success) {
                console.log('--- Verification Successful ---');
            } else {
                console.error('Failed to save assignment.');
            }
        } else {
            console.log('No employees found to test assignment.');
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

testGangShift();
