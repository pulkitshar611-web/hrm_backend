const fs = require('fs');
const path = require('path');

const routes = {
    "Auth": [
        { method: "POST", path: "/api/auth/login", body: { email: "admin@example.com", password: "password", role: "admin" } },
        { method: "POST", path: "/api/auth/refresh-token", body: { refreshToken: "YOUR_REFRESH_TOKEN" } },
        { method: "POST", path: "/api/auth/logout", body: {} },
        { method: "GET", path: "/api/auth/sessions" },
        { method: "POST", path: "/api/auth/terminate-sessions", body: { sessionId: "SESSION_ID" } }
    ],
    "Employees": [
        { method: "GET", path: "/api/employees" },
        { method: "POST", path: "/api/employees", body: { firstName: "John", lastName: "Doe", email: "john@example.com", departmentId: 1, designation: "Developer" } },
        { method: "PUT", path: "/api/employees/bulk-update", body: { employees: [] } },
        { method: "PUT", path: "/api/employees/:id", body: { firstName: "John", lastName: "Doe" } },
        { method: "DELETE", path: "/api/employees/:id" }
    ],
    "Companies": [
        { method: "GET", path: "/api/companies" },
        { method: "POST", path: "/api/companies", body: { name: "Company Inc", address: "123 Street", contact: "1234567890" } },
        { method: "PUT", path: "/api/companies/:id", body: { name: "Company Inc", address: "123 Street" } }
    ],
    "Dashboard": [
        { method: "GET", path: "/api/dashboard/admin-stats" }
    ],
    "Departments": [
        { method: "GET", path: "/api/departments" },
        { method: "POST", path: "/api/departments", body: { name: "IT" } }
    ],
    "Users": [
        { method: "GET", path: "/api/users/me" },
        { method: "PUT", path: "/api/users/preferences", body: { windowPreferences: { theme: "dark" } } },
        { method: "GET", path: "/api/users" },
        { method: "POST", path: "/api/users", body: { username: "newuser", email: "user@example.com", password: "password123", role: "ADMIN" } },
        { method: "PUT", path: "/api/users/:id", body: { username: "updateduser", email: "user@example.com", role: "ADMIN" } },
        { method: "DELETE", path: "/api/users/:id" }
    ],
    "Attendance": [
        { method: "GET", path: "/api/attendance/live" },
        { method: "GET", path: "/api/attendance" },
        { method: "POST", path: "/api/attendance", body: { employeeId: 1, date: "2023-10-27", status: "PRESENT" } },
        { method: "PUT", path: "/api/attendance/:id", body: { status: "ABSENT" } },
        { method: "DELETE", path: "/api/attendance/:id" }
    ],
    "Leaves": [
        { method: "GET", path: "/api/leaves" },
        { method: "POST", path: "/api/leaves", body: { employeeId: 1, startDate: "2023-10-27", endDate: "2023-10-28", reason: "Sick", type: "SICK" } },
        { method: "PUT", path: "/api/leaves/:id", body: { status: "APPROVED" } },
        { method: "DELETE", path: "/api/leaves/:id" }
    ],
    "Payrolls": [
        { method: "GET", path: "/api/payrolls" },
        { method: "GET", path: "/api/payrolls/batches" },
        { method: "POST", path: "/api/payrolls", body: { month: 10, year: 2023 } },
        { method: "POST", path: "/api/payrolls/generate", body: { month: 10, year: 2023 } },
        { method: "POST", path: "/api/payrolls/sync", body: {} },
        { method: "POST", path: "/api/payrolls/finalize", body: { payrollId: 1 } },
        { method: "POST", path: "/api/payrolls/:payrollId/email", body: {} },
        { method: "POST", path: "/api/payrolls/bulk-email", body: { payrollIds: [1, 2] } },
        { method: "PUT", path: "/api/payrolls/:id", body: { baseSalary: 5000 } },
        { method: "DELETE", path: "/api/payrolls/:id" }
    ],
    "Transaction Codes": [
        { method: "GET", path: "/api/transaction-codes" },
        { method: "POST", path: "/api/transaction-codes", body: { code: "TRX001", description: "Salary Payment" } },
        { method: "PUT", path: "/api/transaction-codes/:id", body: { description: "Updated Description" } },
        { method: "DELETE", path: "/api/transaction-codes/:id" }
    ],
    "Transactions": [
        { method: "GET", path: "/api/transactions" },
        { method: "GET", path: "/api/transactions/register" },
        { method: "GET", path: "/api/transactions/:id" },
        { method: "POST", path: "/api/transactions", body: { amount: 100, date: "2023-10-27", description: "Test Transaction" } },
        { method: "POST", path: "/api/transactions/bulk", body: { transactions: [] } },
        { method: "POST", path: "/api/transactions/post", body: { transactionIds: [1, 2] } },
        { method: "POST", path: "/api/transactions/:id/void", body: { reason: "Mistake" } },
        { method: "PUT", path: "/api/transactions/:id", body: { description: "Updated" } },
        { method: "DELETE", path: "/api/transactions/:id" }
    ],
    "Cheques": [
        { method: "GET", path: "/api/cheques" },
        { method: "GET", path: "/api/cheques/history" },
        { method: "GET", path: "/api/cheques/:id" },
        { method: "POST", path: "/api/cheques", body: { amount: 1000, payee: "John Doe", date: "2023-10-27" } },
        { method: "POST", path: "/api/cheques/print", body: { chequeIds: [1] } },
        { method: "POST", path: "/api/cheques/:id/void", body: { reason: "Lost" } },
        { method: "PUT", path: "/api/cheques/:id", body: { payee: "Jane Doe" } },
        { method: "DELETE", path: "/api/cheques/:id" }
    ],
    "Bank Transfers": [
        { method: "GET", path: "/api/bank-transfers" },
        { method: "GET", path: "/api/bank-transfers/export" },
        { method: "GET", path: "/api/bank-transfers/:id" },
        { method: "POST", path: "/api/bank-transfers", body: { amount: 500, employeeId: 1, bankAccountId: 1 } },
        { method: "POST", path: "/api/bank-transfers/batch", body: { transfers: [] } },
        { method: "POST", path: "/api/bank-transfers/process", body: { transferIds: [1] } },
        { method: "PUT", path: "/api/bank-transfers/:id", body: { amount: 600 } },
        { method: "DELETE", path: "/api/bank-transfers/:id" }
    ],
    "Advance Payments": [
        { method: "GET", path: "/api/advance-payments" },
        { method: "GET", path: "/api/advance-payments/summary" },
        { method: "GET", path: "/api/advance-payments/:id" },
        { method: "POST", path: "/api/advance-payments", body: { employeeId: 1, amount: 200, reason: "Emergency" } },
        { method: "POST", path: "/api/advance-payments/:id/approve", body: {} },
        { method: "POST", path: "/api/advance-payments/:id/reject", body: { reason: "Not eligible" } },
        { method: "POST", path: "/api/advance-payments/:id/paid", body: {} },
        { method: "PUT", path: "/api/advance-payments/:id", body: { amount: 250 } },
        { method: "DELETE", path: "/api/advance-payments/:id" }
    ],
    "Processing": [
        { method: "GET", path: "/api/processing/status" },
        { method: "GET", path: "/api/processing/logs" },
        { method: "GET", path: "/api/processing/statistics" },
        { method: "GET", path: "/api/processing/:id" },
        { method: "POST", path: "/api/processing/start", body: { type: "PAYROLL" } },
        { method: "PUT", path: "/api/processing/:id", body: { status: "COMPLETED" } },
        { method: "DELETE", path: "/api/processing/cleanup" }
    ],
    "Redundancies": [
        { method: "POST", path: "/api/redundancies/calculate", body: { employeeId: 1 } },
        { method: "GET", path: "/api/redundancies" },
        { method: "GET", path: "/api/redundancies/:id" },
        { method: "POST", path: "/api/redundancies", body: { employeeId: 1, amount: 5000, reason: "Redundancy" } },
        { method: "PUT", path: "/api/redundancies/:id/status", body: { status: "APPROVED" } },
        { method: "DELETE", path: "/api/redundancies/:id" }
    ],
    "Bank Accounts": [
        { method: "GET", path: "/api/bank-accounts" },
        { method: "GET", path: "/api/bank-accounts/:id" },
        { method: "POST", path: "/api/bank-accounts", body: { bankName: "Bank of America", accountNumber: "1234567890", ifsc: "BOA123" } },
        { method: "PUT", path: "/api/bank-accounts/:id", body: { bankName: "Chase" } },
        { method: "DELETE", path: "/api/bank-accounts/:id" }
    ],
    "Gang Shift": [
        { method: "GET", path: "/api/gang-shift/gangs" },
        { method: "GET", path: "/api/gang-shift/assignments" },
        { method: "POST", path: "/api/gang-shift/assignments", body: { gangId: 1, shiftId: 1 } }
    ],
    "Sales Share": [
        { method: "GET", path: "/api/sales-share" },
        { method: "POST", path: "/api/sales-share", body: { share: 10 } }
    ],
    "System Settings": [
        { method: "GET", path: "/api/system-settings" },
        { method: "PUT", path: "/api/system-settings", body: { settingKey: "value" } }
    ],
    "Audit": [
        { method: "GET", path: "/api/audit" }
    ],
    "Files": [
        { method: "GET", path: "/api/files/export" },
        { method: "POST", path: "/api/files/import", body: {} },
        { method: "POST", path: "/api/files/backup", body: {} },
        { method: "POST", path: "/api/files/restore", body: {} },
        { method: "GET", path: "/api/files/logs" },
        { method: "GET", path: "/api/files/download/:filename" }
    ]
};

const collection = {
    info: {
        name: "HRM Payroll API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [],
    variable: [
        {
            key: "baseUrl",
            value: "http://localhost:5000",
            type: "string"
        }
    ]
};

for (const [group, endpoints] of Object.entries(routes)) {
    const folder = {
        name: group,
        item: []
    };

    for (const endpoint of endpoints) {
        const urlParts = endpoint.path.split('/').filter(p => p !== '');
        // Replace :id with {{id}} variable style for URL path, but wait, Postman uses :id style or {{id}}
        // Postman import usually handles :id. Let's keep it consistent.
        
        const request = {
            method: endpoint.method,
            header: [],
            url: {
                raw: "{{baseUrl}}" + endpoint.path,
                host: ["{{baseUrl}}"],
                path: urlParts
            }
        };

        if (['POST', 'PUT'].includes(endpoint.method) && endpoint.body) {
            request.header.push({
                key: "Content-Type",
                value: "application/json"
            });
            request.body = {
                mode: "raw",
                raw: JSON.stringify(endpoint.body, null, 4),
                options: {
                    raw: {
                        language: "json"
                    }
                }
            };
        }

        folder.item.push({
            name: `${endpoint.method} ${endpoint.path}`,
            request: request,
            response: []
        });
    }

    collection.item.push(folder);
}

fs.writeFileSync(path.join(__dirname, 'HRM_Payroll_API.postman_collection.json'), JSON.stringify(collection, null, 4));
console.log("Postman collection generated at HRM_Payroll_API.postman_collection.json");
