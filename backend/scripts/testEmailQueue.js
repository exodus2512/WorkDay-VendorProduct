import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import transporter from '../utils/emailConfig.js';
import {
  sendTimesheetSubmitted,
  sendTimesheetApproved,
  sendTimesheetRejected,
  sendMilestoneCompleted,
  sendBudgetWarning,
} from '../services/notificationService.js';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 Asynchronous Mailing System - Self-Diagnostic Test');
  console.log('====================================================\n');

  console.log('1. Checking Environment Configurations...');
  console.log(`   - SMTP_HOST: ${process.env.SMTP_HOST || '(not configured, default smtp.gmail.com)'}`);
  console.log(`   - SMTP_PORT: ${process.env.SMTP_PORT || '(not configured, default 465)'}`);
  console.log(`   - SMTP_USER: ${process.env.SMTP_USER || '(not configured)'}`);
  console.log(`   - SMTP_PASS: ${process.env.SMTP_PASS ? '******** (configured)' : '(not configured)'}`);
  console.log(`   - REDIS_URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}\n`);

  console.log('2. Verifying SMTP Transporter Connection...');
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('   ⚠️  SMTP_USER or SMTP_PASS is missing in .env / .env.local.');
      console.log('      Emails will fail when dispatched to actual mailboxes until real credentials are provided.');
    } else {
      await transporter.verify();
      console.log('   ✅ SMTP Server connection verified successfully!');
    }
  } catch (err) {
    console.log(`   ⚠️  SMTP Transporter verify returned: ${err.message}`);
    console.log('      (If using Gmail, ensure 2-Factor Authentication and an App Password is used)');
  }

  console.log('\n3. Testing Job Enqueueing to BullMQ Redis Queue...');
  const testRecipient = process.env.SMTP_USER || 'test.contractor@example.com';
  
  try {
    const job1 = await sendTimesheetSubmitted(testRecipient, 'Alex Rivera', 40);
    console.log(`   ✅ Enqueued "sendTimesheetSubmitted" -> Job ID: ${job1 ? job1.id : 'N/A'}`);

    const job2 = await sendTimesheetApproved(testRecipient, '2026-08-17');
    console.log(`   ✅ Enqueued "sendTimesheetApproved" -> Job ID: ${job2 ? job2.id : 'N/A'}`);

    const job3 = await sendTimesheetRejected(testRecipient, '2026-08-17', 'Hours exceed 40 hrs limit.');
    console.log(`   ✅ Enqueued "sendTimesheetRejected" -> Job ID: ${job3 ? job3.id : 'N/A'}`);

    const job4 = await sendMilestoneCompleted(testRecipient, 'Apex Fintech Modernization', 'M2: Auth & Dashboard');
    console.log(`   ✅ Enqueued "sendMilestoneCompleted" -> Job ID: ${job4 ? job4.id : 'N/A'}`);

    const job5 = await sendBudgetWarning(testRecipient, 'Apex Fintech Modernization', '89.50');
    console.log(`   ✅ Enqueued "sendBudgetWarning" -> Job ID: ${job5 ? job5.id : 'N/A'}`);

    console.log('\n====================================================');
    console.log('🎉 Jobs successfully queued!');
    console.log('👉 To process these jobs, run: npm run worker');
    console.log('====================================================\n');
  } catch (err) {
    console.error('   ❌ Failed to enqueue email jobs:', err.message);
  }

  process.exit(0);
}

runTest();
