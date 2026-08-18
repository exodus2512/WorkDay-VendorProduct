import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    return Math.min(times * 1000, 15000);
  }
});

connection.on('error', (err) => {
  console.warn(`[Invoice Queue Redis Warning]: ${err.message}`);
});

export const invoiceQueue = new Queue('invoice-processing', { connection });

/**
 * Enqueue an invoice generation job
 */
export const addInvoiceGenerationJob = async (data) => {
  try {
    const job = await invoiceQueue.add('GENERATE_INVOICE', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000
      },
      removeOnComplete: 100, // Keep last 100 completed jobs for status query
      removeOnFail: 200
    });
    return job;
  } catch (err) {
    console.error('[InvoiceQueue] Failed to enqueue invoice generation job:', err.message);
    return null;
  }
};

/**
 * Retrieve status and result of an invoice generation job
 */
export const getInvoiceJobStatus = async (jobId) => {
  try {
    const job = await invoiceQueue.getJob(jobId);
    if (!job) {
      return { status: 'NOT_FOUND', error: 'Job not found' };
    }

    const state = await job.getState();
    const isCompleted = state === 'completed';
    const isFailed = state === 'failed';

    return {
      jobId: job.id,
      name: job.name,
      status: state.toUpperCase(), // 'WAITING', 'ACTIVE', 'COMPLETED', 'FAILED'
      data: job.data,
      result: isCompleted ? job.returnvalue : null,
      failedReason: isFailed ? job.failedReason : null,
      progress: job.progress || 0,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn
    };
  } catch (err) {
    console.error(`[InvoiceQueue] Failed to get job status for ${jobId}:`, err.message);
    return { status: 'ERROR', error: err.message };
  }
};
