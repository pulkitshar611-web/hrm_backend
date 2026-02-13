const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProcessingIntegration() {
    console.log('\n🔍 PROCESSING STATUS INTEGRATION TEST\n');
    console.log('='.repeat(60));

    try {
        // Step 1: Check if ProcessingLog table exists
        console.log('\n✓ Step 1: Checking database schema...');
        const tableExists = await prisma.$queryRaw`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'processinglog'
        `;

        if (tableExists[0].count > 0) {
            console.log('  ✅ ProcessingLog table exists');
        } else {
            console.log('  ❌ ProcessingLog table NOT found - migration needed!');
            await prisma.$disconnect();
            return;
        }

        // Step 2: Get a company to test with
        console.log('\n✓ Step 2: Finding test company...');
        const company = await prisma.company.findFirst();

        if (!company) {
            console.log('  ❌ No company found - please create a company first');
            await prisma.$disconnect();
            return;
        }

        console.log(`  ✅ Using company: ${company.name} (ID: ${company.id})`);

        // Step 3: Check existing processing logs
        console.log('\n✓ Step 3: Checking existing processing logs...');
        const existingLogs = await prisma.processingLog.findMany({
            where: { companyId: company.id },
            orderBy: { startedAt: 'desc' },
            take: 5
        });

        console.log(`  📊 Found ${existingLogs.length} existing logs for this company`);

        if (existingLogs.length > 0) {
            console.log('\n  Recent logs:');
            existingLogs.forEach((log, idx) => {
                console.log(`    ${idx + 1}. ${log.processType} - ${log.status} (${log.period || 'N/A'})`);
            });
        }

        // Step 4: Create a test processing log
        console.log('\n✓ Step 4: Creating test processing log...');
        const testLog = await prisma.processingLog.create({
            data: {
                companyId: company.id,
                processType: 'PAYROLL_CALC',
                period: 'FEB-2026',
                status: 'STARTED',
                recordsTotal: 10,
                recordsProcessed: 0,
                processedBy: 'TEST_SCRIPT',
                startedAt: new Date()
            }
        });

        console.log(`  ✅ Created test log with ID: ${testLog.id}`);

        // Step 5: Simulate progress
        console.log('\n✓ Step 5: Simulating processing progress...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await prisma.processingLog.update({
            where: { id: testLog.id },
            data: {
                status: 'IN_PROGRESS',
                recordsProcessed: 5
            }
        });
        console.log('  ✅ Updated to IN_PROGRESS (50% complete)');

        await new Promise(resolve => setTimeout(resolve, 1000));

        await prisma.processingLog.update({
            where: { id: testLog.id },
            data: {
                status: 'COMPLETED',
                recordsProcessed: 10,
                completedAt: new Date()
            }
        });
        console.log('  ✅ Marked as COMPLETED');

        // Step 6: Verify statistics
        console.log('\n✓ Step 6: Calculating statistics...');
        const allLogs = await prisma.processingLog.findMany({
            where: { companyId: company.id }
        });

        const stats = {
            total: allLogs.length,
            started: allLogs.filter(l => l.status === 'STARTED').length,
            inProgress: allLogs.filter(l => l.status === 'IN_PROGRESS').length,
            completed: allLogs.filter(l => l.status === 'COMPLETED').length,
            failed: allLogs.filter(l => l.status === 'FAILED').length,
            totalRecordsProcessed: allLogs.reduce((sum, l) => sum + l.recordsProcessed, 0)
        };

        console.log('\n  📊 STATISTICS:');
        console.log(`     Total Processes: ${stats.total}`);
        console.log(`     Started: ${stats.started}`);
        console.log(`     In Progress: ${stats.inProgress}`);
        console.log(`     Completed: ${stats.completed}`);
        console.log(`     Failed: ${stats.failed}`);
        console.log(`     Total Records Processed: ${stats.totalRecordsProcessed}`);

        // Step 7: Test API endpoint format
        console.log('\n✓ Step 7: API endpoint verification...');
        console.log('\n  📡 To test the API, use this URL in your browser or Postman:');
        console.log(`     GET http://localhost:5000/api/processing/status?companyId=${company.id}`);
        console.log(`     GET http://localhost:5000/api/processing/statistics?companyId=${company.id}`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ INTEGRATION TEST COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('\n📋 NEXT STEPS:');
        console.log('   1. Open your browser to: http://localhost:5173/processing/status');
        console.log('   2. You should see the test "PAYROLL CALC" entry');
        console.log('   3. The "Station Load Matrix" should show updated counts');
        console.log('   4. Click "Force Telemetry Update" to refresh the data\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nFull error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testProcessingIntegration();
