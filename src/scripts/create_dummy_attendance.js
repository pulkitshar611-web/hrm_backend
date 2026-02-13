const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Dummy Attendance Data for Today...");

    // 1. Get all employees
    const employees = await prisma.employee.findMany();
    if (employees.length === 0) {
        console.log("No employees found. Seed employees first.");
        return;
    }

    // 2. Clear existing attendance for today to avoid duplicates
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    await prisma.attendance.deleteMany({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    });
    console.log("Cleared today's attendance records.");

    // 3. Create Status Scenarios
    // Scenario A: WORKING (Clock In, No Out)
    const emp1 = employees[0];
    if (emp1) {
        await prisma.attendance.create({
            data: {
                employeeId: emp1.id,
                date: new Date(),
                checkIn: '08:00 AM',
                status: 'Present'
            }
        });
        console.log(`Set ${emp1.firstName} ${emp1.lastName} to WORKING (08:00 AM)`);
    }

    // Scenario B: ON BREAK
    const emp2 = employees[1];
    if (emp2) {
        await prisma.attendance.create({
            data: {
                employeeId: emp2.id,
                date: new Date(),
                checkIn: '08:30 AM',
                status: 'Break' // Explicit status
            }
        });
        console.log(`Set ${emp2.firstName} ${emp2.lastName} to ON BREAK`);
    }

    // Scenario C: OFF (Completed Shift)
    const emp3 = employees[2];
    if (emp3) {
        await prisma.attendance.create({
            data: {
                employeeId: emp3.id,
                date: new Date(),
                checkIn: '09:00 AM',
                checkOut: '05:00 PM',
                status: 'Present'
            }
        });
        console.log(`Set ${emp3.firstName} ${emp3.lastName} to OFF/COMPLETED`);
    }

    console.log("Done.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
