import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { sendEmail } from '../utils/emailConfig.js';
import { query } from '../db/db.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const emailWorker = new Worker(
    'email-notifications',
    async (job) => {
        const { name, data } = job;

        console.log(`Processing job ${job.id} of type ${name}`);

        if (name === 'daily-deadline-check') {
            await processDailyDeadlines();
            return { success: true, message: 'Daily checks completed' };
        }

        // For specific email jobs
        if (data.to && data.subject && data.html) {
            await sendEmail({
                to: data.to,
                subject: data.subject,
                html: data.html,
            });
            return { success: true };
        }

        throw new Error('Invalid job data');
    },
    {
        connection,
        limiter: {
            max: 1,
            duration: 3000, // Process 1 job per 3 seconds to prevent Gmail rate limits
        },
    }
);

emailWorker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} has failed with ${err.message}`);
});

/**
 * Checks the database for projects and milestones approaching their deadlines
 * and pushes notification tasks to the queue.
 */
async function processDailyDeadlines() {
    const { addEmailJob } = await import('./emailQueue.js');
    const {
        sendProjectDeadlineApproaching,
        sendMilestoneDeadlineApproaching,
    } = await import('../services/notificationService.js');

    try {
        // 1. Check projects closing in 7 days
        const upcomingProjectsRes = await query(`
      SELECT p.name as project_name, u.email as pm_email 
      FROM projects p
      JOIN users u ON p.manager_id = u.id
      WHERE p.end_date::date = CURRENT_DATE + INTERVAL '7 days'
    `);

        for (const project of upcomingProjectsRes.rows) {
            if (project.pm_email) {
                await sendProjectDeadlineApproaching(project.pm_email, project.project_name, 7);
            }
        }

        // 2. Check milestones closing in 3 days
        const upcomingMilestonesRes = await query(`
      SELECT m.title as milestone_title, m.project_id, p.name as project_name, u.email as pm_email
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      JOIN users u ON p.manager_id = u.id
      WHERE m.target_date::date = CURRENT_DATE + INTERVAL '3 days' AND m.status != 'Completed'
    `);

        for (const milestone of upcomingMilestonesRes.rows) {
            if (milestone.pm_email) {
                // Find contractors assigned to this project to CC/email them
                const contractorsRes = await query(`
          SELECT u.email 
          FROM assignments a
          JOIN users u ON a.user_id = u.id
          WHERE a.project_id = $1 AND u.role = 'Contractor'
        `, [milestone.project_id]);

                for (const contractor of contractorsRes.rows) {
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

        // 3. (Optional) Check timesheet deadlines - e.g., if today is Thursday, send a reminder
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 4) { // Thursday
            const contractorsRes = await query(`SELECT email FROM users WHERE role = 'Contractor'`);
            const { sendTimesheetDeadlineReminder } = await import('../services/notificationService.js');

            for (const contractor of contractorsRes.rows) {
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