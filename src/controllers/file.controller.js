const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');

// Backup directory
const BACKUP_DIR = path.join(__dirname, '../../backups');

const exportData = async (req, res, next) => {
    try {
        const { companyId } = req.query;

        // Fetch primary data sets
        const employees = await prisma.employee.findMany({
            where: companyId ? { companyId } : {}
        });
        const transactions = await prisma.transaction.findMany({
            where: companyId ? { companyId } : {}
        });
        const advancePayments = await prisma.advancePayment.findMany({
            where: companyId ? { companyId } : {}
        });
        const bankAccounts = await prisma.bankAccount.findMany({
            where: companyId ? { companyId } : {}
        });

        const exportObj = {
            exportDate: new Date(),
            version: "1.0.0",
            companyId: companyId || 'ALL',
            data: {
                employees,
                transactions,
                advancePayments,
                bankAccounts
            }
        };

        return successResponse(res, exportObj, "Master Data Exported Successfully");
    } catch (error) {
        next(error);
    }
};

const XLSX = require('xlsx');

const importData = async (req, res, next) => {
    try {
        if (!req.file) {
            return errorResponse(res, "No file uploaded", "VALIDATION_ERROR", 400);
        }

        const filePath = req.file.path;
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        let importObj = { data: {} };
        let count = 0;

        if (fileExt === '.json' || fileExt === '.bak') {
            const fileContent = await fs.readFile(filePath, 'utf8');
            try {
                importObj = JSON.parse(fileContent);
                if (!importObj.data) {
                    return errorResponse(res, "Invalid import format: Missing data segment.", "INVALID_FILE", 400);
                }
            } catch (e) {
                await fs.remove(filePath);
                return errorResponse(res, "File corruption detected. Could not parse data payload.", "PARSE_ERROR", 400);
            }
        } else if (fileExt === '.xlsx' || fileExt === '.xls' || fileExt === '.csv') {
            // Handle Spreadsheet imports (Employees, Transactions, etc.)
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            if (!rawData || rawData.length === 0) {
                await fs.remove(filePath);
                return errorResponse(res, "Selected archive contains no readable entries.", "EMPTY_FILE", 400);
            }

            // Heuristic detection of data type
            const firstRow = rawData[0];
            const keys = Object.keys(firstRow).map(k => k.toLowerCase());

            if (keys.includes('employeeid') || keys.includes('firstname')) {
                importObj.data.employees = rawData;
            } else if (keys.includes('amount') && (keys.includes('reference') || keys.includes('type'))) {
                importObj.data.transactions = rawData;
            } else if (keys.includes('accountnumber')) {
                importObj.data.bankAccounts = rawData;
            } else {
                // Fallback: If filename mentions 'payroll', treat as transactions
                if (req.file.originalname.toLowerCase().includes('payroll')) {
                    importObj.data.transactions = rawData;
                } else {
                    await fs.remove(filePath);
                    return errorResponse(res, "Unrecognized station protocol. Data mapping failed for this format.", "UNRECOGNIZED_SCHEMA", 400);
                }
            }
        } else {
            await fs.remove(filePath);
            return errorResponse(res, `Unsupported protocol [${fileExt.toUpperCase()}]. Internal sync required.`, "INVALID_FORMAT", 400);
        }

        const { employees, transactions, bankAccounts } = importObj.data;

        // Fetch a default companyId for mapping
        const defaultCompany = await prisma.company.findFirst();
        const defaultCompanyId = defaultCompany?.id || 'SYSTEM';

        // Perform imports in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Import Employees
            if (employees && employees.length > 0) {
                for (const emp of employees) {
                    const { id, createdAt, updatedAt, ...raw } = emp;
                    // Provide defaults for required fields
                    const empData = {
                        employeeId: raw.employeeId || raw.EmployeeID || `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        firstName: raw.firstName || raw.FirstName || 'Unknown',
                        lastName: raw.lastName || raw.LastName || 'Employee',
                        companyId: raw.companyId || defaultCompanyId,
                        status: raw.status || 'Active',
                        payFrequency: raw.payFrequency || 'Monthly',
                        ...raw
                    };

                    await tx.employee.upsert({
                        where: { employeeId: empData.employeeId },
                        update: empData,
                        create: empData
                    });
                    count++;
                }
            }

            // 2. Import Bank Accounts
            if (bankAccounts && bankAccounts.length > 0) {
                for (const acc of bankAccounts) {
                    const { id, createdAt, updatedAt, company, ...raw } = acc;
                    const accData = {
                        companyId: raw.companyId || defaultCompanyId,
                        bankName: raw.bankName || 'Unknown Bank',
                        bankBranch: raw.bankBranch || 'Main',
                        accountNumber: raw.accountNumber || '0000000',
                        isActive: raw.isActive !== undefined ? raw.isActive : true,
                        ...raw
                    };

                    await tx.bankAccount.upsert({
                        where: { id: id || 'new-uuid' },
                        update: accData,
                        create: accData
                    });
                    count++;
                }
            }

            // 3. Import Transactions
            if (transactions && transactions.length > 0) {
                for (const trn of transactions) {
                    const { id, createdAt, updatedAt, ...raw } = trn;

                    // Normalize keys
                    const d = {};
                    Object.keys(raw).forEach(k => d[k.toLowerCase()] = raw[k]);

                    // Required field: employeeId (must be a valid record ID)
                    let targetEmpId = d.employeeid || d.id;
                    if (targetEmpId) {
                        const emp = await tx.employee.findFirst({
                            where: { OR: [{ id: targetEmpId }, { employeeId: targetEmpId }] }
                        });
                        if (emp) targetEmpId = emp.id;
                        else targetEmpId = null;
                    }

                    if (!targetEmpId) continue; // Skip header/summary rows that don't map to an employee

                    const postData = {
                        companyId: d.companyid || defaultCompanyId,
                        employeeId: targetEmpId,
                        transactionDate: d.transactiondate ? new Date(d.transactiondate) : new Date(),
                        type: d.type || 'EARNING',
                        code: (d.code || d.category || 'MISC').substring(0, 20),
                        description: d.description || d.category || 'Imported Entry',
                        amount: parseFloat(d.amount || 0),
                        units: d.units ? parseFloat(d.units) : (d.count ? parseFloat(d.count) : 0),
                        rate: d.rate ? parseFloat(d.rate) : 0,
                        status: d.status || 'ENTERED',
                        period: d.period || 'CURRENT',
                        enteredBy: d.enteredby || 'System Import'
                    };

                    await tx.transaction.upsert({
                        where: { id: id || 'new-uuid' },
                        update: postData,
                        create: postData
                    });
                    count++;
                }
            }
        });

        // Cleanup temp file
        await fs.remove(filePath);

        return successResponse(res, { recordsProcessed: count }, "Data Imported Successfully");
    } catch (error) {
        next(error);
    }
};

const backupSystem = async (req, res, next) => {
    try {
        await fs.ensureDir(BACKUP_DIR);

        const tables = [
            'company', 'department', 'employee', 'transaction',
            'advancePayment', 'bankAccount', 'redundancy',
            'bankTransfer', 'cheque', 'processingLog'
        ];

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFolder = path.join(BACKUP_DIR, `backup-${timestamp}`);
        await fs.ensureDir(backupFolder);

        const zip = new AdmZip();

        for (const table of tables) {
            const data = await prisma[table].findMany();
            const filePath = path.join(backupFolder, `${table}.json`);
            await fs.writeJson(filePath, data, { spaces: 2 });
            zip.addLocalFile(filePath);
        }

        const zipPath = path.join(BACKUP_DIR, `HRM_BACKUP_${timestamp}.zip`);
        zip.writeZip(zipPath);

        // Cleanup temp folder
        await fs.remove(backupFolder);

        const stats = await fs.stat(zipPath);

        const result = {
            id: `BK-${Date.now()}`,
            filename: path.basename(zipPath),
            size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
            date: new Date(),
            status: 'VERIFIED'
        };

        return successResponse(res, result, "System Backup Created Successfully");
    } catch (error) {
        next(error);
    }
};

const restoreSystem = async (req, res, next) => {
    try {
        if (!req.file) {
            return errorResponse(res, "No backup file uploaded", "VALIDATION_ERROR", 400);
        }

        const filePath = req.file.path;
        const zip = new AdmZip(filePath);
        const tempPath = path.join(BACKUP_DIR, `temp-restore-${Date.now()}`);
        await fs.ensureDir(tempPath);
        zip.extractAllTo(tempPath, true);

        const files = await fs.readdir(tempPath);
        let restoredCount = 0;

        // Restore logic: This is dangerous, usually involves clearing tables
        // For production safety, we'll only restore tables present in the zip
        await prisma.$transaction(async (tx) => {
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const tableName = file.replace('.json', '');
                    const data = await fs.readJson(path.join(tempPath, file));

                    if (data && data.length > 0) {
                        // Clear existing
                        await tx[tableName].deleteMany();
                        // Insert new (chunked if large)
                        await tx[tableName].createMany({ data });
                        restoredCount += data.length;
                    }
                }
            }
        });

        // Cleanup
        await fs.remove(tempPath);
        await fs.remove(filePath);

        return successResponse(res, { recordsRestored: restoredCount }, "System Restored Successfully");
    } catch (error) {
        next(error);
    }
};

const getBackupLogs = async (req, res, next) => {
    try {
        await fs.ensureDir(BACKUP_DIR);
        const files = await fs.readdir(BACKUP_DIR);
        const logs = await Promise.all(files.filter(f => f.endsWith('.zip')).map(async f => {
            const stats = await fs.stat(path.join(BACKUP_DIR, f));
            return {
                id: f.split('_')[2]?.replace('.zip', '') || Date.now(),
                filename: f,
                date: stats.mtime,
                type: 'BACKUP',
                size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
                user: 'System',
                status: 'VERIFIED'
            };
        }));

        return successResponse(res, logs.sort((a, b) => b.date - a.date));
    } catch (error) {
        next(error);
    }
};

const downloadBackup = async (req, res, next) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(BACKUP_DIR, filename);
        if (!(await fs.pathExists(filePath))) {
            return errorResponse(res, "Backup file not found", "NOT_FOUND", 404);
        }
        res.download(filePath);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    exportData,
    importData,
    backupSystem,
    restoreSystem,
    getBackupLogs,
    downloadBackup
};
