const http = require('http');

const data = JSON.stringify({
  companyId: '0937a4c7-876a-4649-ade2-938b8ca81373',
  bankName: 'Test Bank Node Native',
  bankBranch: 'Main Branch',
  accountNumber: '123456789',
  identificationNo: 'ID123',
  glAccount: 'GL001',
  exportPath: '/tmp'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/bank-accounts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
