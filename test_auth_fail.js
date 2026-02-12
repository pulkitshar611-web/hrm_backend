const http = require('http');

async function testAuth() {
    console.log('--- Testing /api/departments Authorization ---');

    // Test without token
    console.log('\n1. Testing without token...');
    try {
        const res = await makeRequest('GET', '/api/departments?companyId=test');
        console.log('Response:', JSON.stringify(res, null, 2));
    // 2. Test with invalid token
    console.log('\n2. Testing with invalid token...');
    try {
        const res = await makeRequest('GET', '/api/departments?companyId=test', null, {
            'Authorization': 'Bearer invalid_token_here'
        });
        console.log('Response:', JSON.stringify(res, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
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

testAuth();
