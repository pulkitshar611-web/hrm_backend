require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const { startLeaveAccrualJob } = require('./services/leaveAccrual.service');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (required for accurate IPs on Railway/Cloud)
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://hrm-m.kiaantechnology.com',
    process.env.FRONTEND_URL
].filter(Boolean);



app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(null, false);
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/companies', require('./routes/company.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/departments', require('./routes/department.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/leaves', require('./routes/leave.routes'));
app.use('/api/payrolls', require('./routes/payroll.routes'));

// Finance Routes
app.use('/api/transaction-codes', require('./routes/transactionCode.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/cheques', require('./routes/cheque.routes'));
app.use('/api/bank-transfers', require('./routes/bankTransfer.routes'));
app.use('/api/advance-payments', require('./routes/advancePayment.routes'));
app.use('/api/processing', require('./routes/processing.routes'));
app.use('/api/redundancies', require('./routes/redundancy.routes'));
app.use('/api/bank-accounts', require('./routes/bankAccount.routes'));
app.use('/api/gang-shift', require('./routes/gangShift.routes'));
app.use('/api/sales-share', require('./routes/salesShare.routes'));
app.use('/api/system-settings', require('./routes/systemSettings.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/files', require('./routes/file.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/beneficiaries', require('./routes/beneficiary.routes'));

// Root route
app.get('/', (req, res) => {
    res.json({ message: "HRM API is running..." });
});

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startLeaveAccrualJob(); // Start automated leave accrual cron
});
