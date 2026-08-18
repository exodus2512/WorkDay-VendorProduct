import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import Redis from 'ioredis';
import './worker/emailWorker.js';
import './worker/invoiceWorker.js';
import './worker/timerWorker.js';
import { initializeScheduler } from './worker/emailQueue.js';
import { initializeTimerScheduler } from './worker/timerQueue.js';

console.log('----------------------------------------------------');
console.log('🚀 Starting Contingent Workforce Background Worker...');
console.log(`📡 Redis Target: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log(`✉️  SMTP Host:    ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
console.log(`👤 SMTP User:    ${process.env.SMTP_USER || '(not set)'}`);
console.log('----------------------------------------------------');

async function start() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  try {
    // Disable stop-writes-on-bgsave-error to prevent Windows Redis disk snapshotting write lockups
    await redis.config('SET', 'stop-writes-on-bgsave-error', 'no');
  } catch (err) {
    // Ignore if managed redis cloud does not allow CONFIG SET
  }

  await initializeScheduler();
  await initializeTimerScheduler();
  console.log('✅ Worker is now actively listening to queues:');
  console.log('   - "email-notifications" (Transactional Email & Reminders)');
  console.log('   - "invoice-processing"  (Async 7-Point Audit & PDF Pipeline)');
  console.log('   - "timer-jobs"          (Midnight Auto-Stop & Timer Safety Net)');
}

start().catch((err) => {
  console.error('❌ Failed to initialize worker/scheduler:', err);
});
