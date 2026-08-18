import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import Redis from 'ioredis';
import { addInvoiceGenerationJob, getInvoiceJobStatus } from '../worker/invoiceQueue.js';
import { invoiceWorker } from '../worker/invoiceWorker.js';
import { handleInvoices } from '../api/invoices.js';
import { query } from '../db/db.js';

async function runInvoiceQueueTest() {
  console.log('====================================================');
  console.log('🧪 Testing Asynchronous Invoice Generation Queue Flow');
  console.log('====================================================\n');

  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    try {
      await redis.config('SET', 'stop-writes-on-bgsave-error', 'no');
    } catch (e) {}

    // 1. Create a dedicated test project with an active assignment and approved milestone
    console.log('1. Setting up fresh test project for async invoice pipeline...');
    const pInsert = await query(
      `INSERT INTO projects (vendor_id, name, client_name, description, budget, start_date, end_date, status)
       VALUES (1, 'Async Queue Benchmark Project', 'Apex Financial Services', 'Queue testing', 50000.00, '2026-08-01', '2026-12-31', 'ACTIVE') RETURNING *`
    );
    const testProject = pInsert.rows[0];

    // Add active assignment
    const aInsert = await query(
      `INSERT INTO assignments (project_id, employee_id, role, start_date, end_date, billing_rate, weekly_hour_limit, status)
       VALUES ($1, 4, 'Senior Architect', '2026-08-01', '2026-12-31', 100.00, 40, 'ACTIVE') RETURNING *`,
      [testProject.id]
    );

    // Add approved milestone
    const mInsert = await query(
      `INSERT INTO milestones (project_id, name, description, amount, due_date, status)
       VALUES ($1, 'Deliverable Alpha: Async Engine', 'Complete BullMQ Integration', 15000.00, '2026-08-30', 'APPROVED') RETURNING *`,
      [testProject.id]
    );
    const testMilestone = mInsert.rows[0];
    console.log(`   Created Test Project "${testProject.name}" (ID: ${testProject.id}) with Milestone ID: ${testMilestone.id}`);

    // 2. Dispatch Async Job via handleInvoices API route (HTTP 202 Accepted simulation)
    console.log('\n2. Calling API: POST /api/invoices/generate-async...');
    const fakeReq = {
      method: 'POST',
      headers: { get: (h) => (h === 'x-async' ? 'true' : null) },
      user: { id: 1, role: 'VENDOR_ADMIN' },
      json: async () => ({
        project_id: testProject.id,
        milestone_ids: [testMilestone.id],
        status: 'SENT',
        async: true
      })
    };

    const apiRes = await handleInvoices(fakeReq, ['generate-async'], new URLSearchParams());
    console.log(`   Response Status: ${apiRes.status}`);
    console.log(`   Response Body:   ${JSON.stringify(apiRes.body)}`);

    if (apiRes.status !== 202 || !apiRes.body.jobId) {
      throw new Error('Async invoice generation failed to return HTTP 202 and jobId');
    }

    const jobId = apiRes.body.jobId;
    console.log(`\n3. Job Enqueued with ID: "${jobId}". Polling for completion...`);

    // 3. Poll job status
    let attempts = 0;
    let jobStatus;
    while (attempts < 15) {
      await new Promise(r => setTimeout(r, 1000));
      jobStatus = await getInvoiceJobStatus(jobId);
      console.log(`   [Poll #${attempts + 1}] Status: ${jobStatus.status} | Progress: ${jobStatus.progress}%`);

      if (jobStatus.status === 'COMPLETED' || jobStatus.status === 'FAILED') {
        break;
      }
      attempts++;
    }

    if (jobStatus.status !== 'COMPLETED') {
      throw new Error(`Job failed or timed out. Reason: ${jobStatus.failedReason || 'Timeout'}`);
    }

    console.log('\n4. Background Job Result:');
    console.log(`   - Invoice ID:     ${jobStatus.result.invoice_id}`);
    console.log(`   - Invoice Number: ${jobStatus.result.invoice_number}`);
    console.log(`   - Total Amount:   $${parseFloat(jobStatus.result.total).toLocaleString()}`);
    console.log(`   - Items Count:    ${jobStatus.result.items_count}`);
    console.log(`   - PDF Filename:   ${jobStatus.result.filename}`);

    // 5. Verify database record
    console.log('\n5. Verifying Database Record...');
    const verifyRes = await query('SELECT * FROM invoices WHERE id = $1', [jobStatus.result.invoice_id]);
    if (verifyRes.rows.length === 0) {
      throw new Error('Invoice was not found in database');
    }
    console.log(`   ✅ Confirmed invoice #${verifyRes.rows[0].invoice_number} exists in database!`);

    console.log('\n====================================================');
    console.log('🎉 ASYNC INVOICE QUEUE PIPELINE VERIFIED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Async invoice test failed:', err);
    process.exit(1);
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
}

runInvoiceQueueTest();
