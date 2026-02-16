const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log("--- Starting Mock Data Cleanup ---");

    const mockEmpIds = ['EMP101', 'EMP102', 'EMP204', 'EMP205'];

    // Find these employees
    const employees = await prisma.employee.findMany({
        where: { employeeId: { in: mockEmpIds } }
    });

    if (employees.length === 0) {
        console.log("No mock employees found. Database might already be clean.");
        return;
    }

    const empUuids = employees.map(e => e.id);

    // Delete dependent records first to avoid constraint violations
    console.log(`Cleaning up records for ${employees.length} mock employees...`);

    try {
        await prisma.payroll.deleteMany({ where: { employeeId: { in: empUuids } } });
        await prisma.transaction.deleteMany({ where: { employeeId: { in: empUuids } } });
        await prisma.bankTransfer.deleteMany({ where: { employeeId: { in: empUuids } } });
        await prisma.leave.deleteMany({ where: { employeeId: { in: empUuids } } });
        await prisma.attendance.deleteMany({ where: { employeeId: { in: empUuids } } });

        // Finally delete the employees
        const deleted = await prisma.employee.deleteMany({
            where: { id: { in: empUuids } }
        });

        console.log(`Successfully removed ${deleted.count} mock employees and their related records.`);
    } catch (err) {
        console.error("Cleanup failed:", err);
    } finally {
        await prisma.$disconnect();
    }

    console.log("--- Cleanup Complete ---");
}

cleanup();
