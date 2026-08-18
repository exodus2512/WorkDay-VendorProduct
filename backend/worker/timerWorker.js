import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { Worker } from "bullmq";
import { timerConnection } from "./timerQueue.js";
import { query } from "../db/db.js";
import { addEmailJob } from "./emailQueue.js";

function secondsSince(ts) {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
}

function getMondayOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

export const timerWorker = new Worker(
  "timer-jobs",
  async (job) => {
    const { name } = job;
    console.log(`[TimerWorker] Processing job: ${name}`);

    if (name !== "MIDNIGHT_AUTOSTOP") {
      throw new Error(`Unknown timer job type: ${name}`);
    }

    // Find all running timer sessions
    const running = await query(
      `SELECT ts.*, u.email, u.name AS user_name, p.name AS project_name
       FROM timer_sessions ts
       JOIN users u ON u.id = ts.user_id
       LEFT JOIN assignments a ON a.id = ts.assignment_id
       LEFT JOIN projects p ON p.id = a.project_id
       WHERE ts.status = 'RUNNING'`
    );

    console.log(`[TimerWorker] Found ${running.rows.length} running sessions to auto-stop.`);

    for (const s of running.rows) {
      try {
        const totalSeconds = s.total_seconds_accumulated + (s.last_resumed_at ? secondsSince(s.last_resumed_at) : 0);
        const hoursLogged = Math.round((totalSeconds / 3600) * 100) / 100;

        if (hoursLogged >= 0.01) {
          const entryDate = new Date(s.started_at).toISOString().split("T")[0];
          const weekStart = getMondayOfWeek(entryDate);

          let timesheetId;
          const existingTs = await query(
            `SELECT id FROM timesheets WHERE assignment_id = $1 AND employee_id = $2 AND week_start = $3`,
            [s.assignment_id, s.user_id, weekStart]
          );
          if (existingTs.rows.length > 0) {
            timesheetId = existingTs.rows[0].id;
          } else {
            const newTs = await query(
              `INSERT INTO timesheets (assignment_id, employee_id, week_start, total_hours, work_description, status) VALUES ($1, $2, $3, 0, '', 'DRAFT') RETURNING id`,
              [s.assignment_id, s.user_id, weekStart]
            );
            timesheetId = newTs.rows[0].id;
          }

          const existingEntry = await query(
            `SELECT id, hours FROM timesheet_entries WHERE timesheet_id = $1 AND date = $2`,
            [timesheetId, entryDate]
          );

          let entryId;
          const autoDesc = `[Auto-logged] Timer work on ${s.project_name || "Project"} — auto-stopped at midnight`;

          if (existingEntry.rows.length > 0) {
            const newHours = Math.round((parseFloat(existingEntry.rows[0].hours) + hoursLogged) * 100) / 100;
            const updated = await query(`UPDATE timesheet_entries SET hours = $1, description = $2 WHERE id = $3 RETURNING id`, [newHours, autoDesc, existingEntry.rows[0].id]);
            entryId = updated.rows[0].id;
          } else {
            const inserted = await query(`INSERT INTO timesheet_entries (timesheet_id, date, hours, description) VALUES ($1, $2, $3, $4) RETURNING id`, [timesheetId, entryDate, hoursLogged, autoDesc]);
            entryId = inserted.rows[0].id;
          }

          await query(
            `UPDATE timesheets SET total_hours = (SELECT COALESCE(SUM(hours), 0) FROM timesheet_entries WHERE timesheet_id = $1) WHERE id = $1`,
            [timesheetId]
          );

          await query(
            `UPDATE timer_sessions SET status = 'STOPPED', total_seconds_accumulated = $1, last_resumed_at = NULL, timesheet_entry_id = $2, updated_at = NOW() WHERE id = $3`,
            [totalSeconds, entryId, s.id]
          );
        } else {
          await query(`UPDATE timer_sessions SET status = 'STOPPED', total_seconds_accumulated = $1, updated_at = NOW() WHERE id = $2`, [totalSeconds, s.id]);
        }

        // Email the contractor to verify hours
        if (s.email) {
          await addEmailJob("timer-midnight-autostop", {
            to: s.email,
            subject: `Timer Auto-Stopped: ${hoursLogged}h logged to your timesheet`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0284c7;">⏱ Timer Auto-Stopped at Midnight</h2>
                <p>Hello ${s.user_name},</p>
                <p>Your timer for <strong>${s.project_name || "your project"}</strong> was automatically stopped at midnight.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Hours Logged:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #16a34a; font-weight: bold;">${hoursLogged}h</td></tr>
                  <tr><td style="padding: 8px;"><strong>Date:</strong></td><td style="padding: 8px;">${new Date(s.started_at).toLocaleDateString()}</td></tr>
                </table>
                <p>Please log in to review and verify these hours in your timesheet before submitting to your PM.</p>
              </div>
            `
          });
        }

        console.log(`[TimerWorker] Auto-stopped session ${s.id} for user ${s.user_id} (${hoursLogged}h logged).`);
      } catch (err) {
        console.error(`[TimerWorker] Failed to auto-stop session ${s.id}:`, err);
      }
    }

    return { stopped: running.rows.length };
  },
  {
    connection: timerConnection,
    concurrency: 1
  }
);

timerWorker.on("completed", (job, result) => {
  console.log(`✅ [TimerWorker] Midnight auto-stop complete — ${result.stopped} sessions stopped.`);
});

timerWorker.on("failed", (job, err) => {
  console.error(`❌ [TimerWorker] Job failed:`, err.message);
});
