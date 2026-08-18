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
    // Gracefully report Redis connection status without crashing the process
    console.warn(`[Redis Queue Warning]: ${err.message}`);
});

export const emailQueue = new Queue('email-notifications', { connection });

// Initialize the Daily Job Scheduler
export const initializeScheduler = async () => {
    try {
        // Runs every morning at 8:00 AM
        await emailQueue.upsertJobScheduler(
            'daily-deadline-checker-scheduler',
            {
                pattern: '0 8 * * *', // 8:00 AM daily
                tz: 'UTC',
            },
            {
                name: 'daily-deadline-check',
                data: {}, // No specific data needed for the generic check
            }
        );
        console.log('Daily Job Scheduler for deadline checks initialized.');
    } catch (error) {
        console.error('Error initializing daily scheduler:', error);
    }
};

export const addEmailJob = async (name, data) => {
    try {
        return await emailQueue.add(name, data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
    } catch (err) {
        console.error(`[EmailQueue] Failed to enqueue job "${name}":`, err.message);
        return null;
    }
};