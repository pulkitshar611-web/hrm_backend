const http = require('http');

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
                    resolve({
                        status: res.statusCode,
                        body: body ? JSON.parse(body) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function verifyPayroll(cid) {
    console.log('\n--- Verifying Payroll Integration ---');
    
    // 1. Generate Payrolls
    console.log('\n1. Generating payrolls for Jan 2026...');
    const genRes = await makeRequest('POST', '/api/payrolls/generate', {
        companyId: cid,
        period: '2026-01'
    });
    console.log('Generate Response:', JSON.stringify(genRes, null, 2));

    // 2. Fetch Payrolls
    console.log('\n2. Fetching payrolls...');
    const fetchRes = await makeRequest('GET', `/api/payrolls?companyId=${cid}&period=2026-01`);
    console.log('Fetch Response (Count):', fetchRes.body?.data?.length);
    if (fetchRes.body?.data?.length > 0) {
        console.log('Sample Record:', JSON.stringify(fetchRes.body.data[0], null, 2));
    }

    // 3. Finalize Batch
    console.log('\n3. Finalizing batch...');
    const finRes = await makeRequest('POST', '/api/payrolls/finalize', {
        companyId: cid,
        period: '2026-01'
    });
    console.log('Finalize Response:', JSON.stringify(finRes, null, 2));
}

async function run() {
    try {
        const companies = await makeRequest('GET', '/api/companies');
        if (companies.body?.data?.length > 0) {
            const cid = companies.body.data[0].id;
            console.log('Using Company:', companies.body.data[0].name, '(', cid, ')');
            
            const employees = await makeRequest('GET', `/api/employees?companyId=${cid}`);
            console.log('Employee Count:', employees.body?.data?.length);

            await verifyPayroll(cid);
        } else {
            console.log('No companies found.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
