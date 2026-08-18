import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
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
                tz: 'UTC', // You can change this to your desired timezone, e.g., 'America/New_York'
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
    return await emailQueue.add(name, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    });
};