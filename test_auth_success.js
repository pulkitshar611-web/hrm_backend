const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET;
const payload = { id: 'test-user-id', role: 'ADMIN', email: 'admin@example.com' };
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('Generated Token:', token);

const http = require('http');

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

async function test() {
    console.log('--- Testing with manual valid token ---');
    const res = await makeRequest('GET', '/api/departments?companyId=test', null, {
        'Authorization': `Bearer ${token}`
    });
    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));
}

test();
