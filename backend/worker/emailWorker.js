import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { sendEmail } from '../utils/emailConfig.js';
import { query } from '../db/db.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        return Math.min(times * 1000, 15000);
    }
});

connection.on('error', (err) => {
    console.warn(`[Redis Worker Warning]: ${err.message}`);
});

export const emailWorker = new Worker(
    'email-notifications',
    async (job) => {
        const { name, data } = job;

        console.log(`[Worker] Processing job #${job.id} (${name})`);

        if (name === 'daily-deadline-check') {
            await processDailyDeadlines();
            return { success: true, message: 'Daily checks completed' };
        }

        // For specific email jobs
        if (data && data.to && data.subject && data.html) {
            await sendEmail({
                to: data.to,
                cc: data.cc,
                subject: data.subject,
                html: data.html,
            });
            return { success: true };
        }

        throw new Error('Invalid job data: Missing to, subject, or html');
    },
    {
        connection,
        limiter: {
            max: 1,
            duration: 3000, // Process 1 job per 3 seconds to stay well within email rate limits
        },
    }
);

emailWorker.on('completed', (job) => {
    console.log(`✅ Job #${job.id} (${job.name}) completed successfully!`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`❌ Job #${job ? job.id : 'unknown'} (${job ? job.name : 'unknown'}) failed: ${err.message}`);
});

/**
 * Checks the database for projects and milestones approaching their deadlines
 * and pushes notification tasks to the queue.
 */
async function processDailyDeadlines() {
    const {
        sendProjectDeadlineApproaching,
        sendMilestoneDeadlineApproaching,
        sendTimesheetDeadlineReminder,
    } = await import('../services/notificationService.js');

    try {
        // 1. Check projects closing in 7 days
        const upcomingProjectsRes = await query(`
            SELECT p.name as project_name, u.email as pm_email 
            FROM projects p
            JOIN users u ON p.project_manager_id = u.id
            WHERE p.end_date::date = CURRENT_DATE + INTERVAL '7 days'
        `);

        for (const project of (upcomingProjectsRes.rows || [])) {
            if (project.pm_email) {
                await sendProjectDeadlineApproaching(project.pm_email, project.project_name, 7);
            }
        }

        // 2. Check milestones closing in 3 days
        const upcomingMilestonesRes = await query(`
            SELECT m.name as milestone_title, m.project_id, p.name as project_name, u.email as pm_email
            FROM milestones m
            JOIN projects p ON m.project_id = p.id
            JOIN users u ON p.project_manager_id = u.id
            WHERE m.due_date::date = CURRENT_DATE + INTERVAL '3 days' AND m.status NOT IN ('Completed', 'COMPLETED', 'APPROVED')
        `);

        for (const milestone of (upcomingMilestonesRes.rows || [])) {
            if (milestone.pm_email) {
                // Find contractors assigned to this project
                const contractorsRes = await query(`
                    SELECT u.email 
                    FROM assignments a
                    JOIN users u ON a.employee_id = u.id
                    WHERE a.project_id = $1 AND u.role IN ('EMPLOYEE', 'Contractor')
                `, [milestone.project_id]);

                for (const contractor of (contractorsRes.rows || [])) {
                    if (contractor.email) {
                        await sendMilestoneDeadlineApproaching(
                            contractor.email,
                            milestone.pm_email,
                            milestone.milestone_title,
                            3
                        );
                    }
                }
            }
        }

        // 3. Check timesheet deadlines - e.g. Thursday reminder
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 4) { // Thursday
            const contractorsRes = await query(`SELECT email FROM users WHERE role IN ('EMPLOYEE', 'Contractor')`);
            for (const contractor of (contractorsRes.rows || [])) {
                if (contractor.email) {
                    await sendTimesheetDeadlineReminder(contractor.email);
                }
            }
        }

    } catch (err) {
        console.error('Error processing daily deadlines:', err);
        throw err;
    }
}