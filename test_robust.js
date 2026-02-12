const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('No company found in database');
      return;
    }
    console.log('Using Company ID:', company.id);

    const http = require('http');
    const data = JSON.stringify({
      companyId: company.id,
      bankName: 'First Test Bank',
      bankBranch: 'Downtown',
      accountNumber: '000111222',
      identificationNo: 'ID001',
      glAccount: '1000-01',
      exportPath: 'C:\\Exports'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/bank-accounts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
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

    req.on('error', (e) => console.error('Error:', e.message));
    req.write(data);
    req.end();

  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
