import jwt from "jsonwebtoken";
import { query } from "../db/db.js";

const JWT_SECRET = process.env.JWT_SECRET || 'workforce_vendor_product_secret_key_2026';

function secondsSince(ts) {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
}

function getMondayOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

export async function handleTimer(req, pathSegments, queryParams) {
  const method = req.method;
  const action = pathSegments[0];

  let user = req.user;

  // 1. Check Authorization Bearer header
  if (!user) {
    const authHeader = req.headers?.get?.('authorization') || req.headers?.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        // Invalid token
      }
    }
  }

  // 2. Check x-user-id header or user_id query parameter
  if (!user) {
    const headerUserId = req.headers?.get?.('x-user-id') || req.headers?.['x-user-id'];
    const queryUserId = queryParams?.get?.('user_id');
    const uid = headerUserId || queryUserId;
    if (uid) {
      user = { id: parseInt(uid, 10) };
    }
  }

  // For POST requests, we can also extract user_id from body if present
  let body = null;
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
  }

  if (!user && body && body.user_id) {
    user = { id: parseInt(body.user_id, 10) };
  }

  if (!user || !user.id) {
    return { status: 401, body: { error: "Unauthorized - missing or invalid user session." } };
  }

  const userId = user.id;

  // GET /api/timer/active
  if (method === "GET" && action === "active") {
    const res = await query(
      `SELECT ts.*,
         a.billing_rate, a.weekly_hour_limit,
         p.name AS project_name, p.billing_currency,
         m.name AS milestone_name, m.amount AS milestone_budget
       FROM timer_sessions ts
       LEFT JOIN assignments a ON a.id = ts.assignment_id
       LEFT JOIN projects p ON p.id = a.project_id
       LEFT JOIN milestones m ON m.id = ts.milestone_id
       WHERE ts.user_id = $1 AND ts.status IN ('RUNNING', 'PAUSED')
       ORDER BY ts.created_at DESC LIMIT 1`,
      [userId]
    );
    if (res.rows.length === 0) return { status: 200, body: null };
    const s = res.rows[0];
    let displaySeconds = s.total_seconds_accumulated;
    if (s.status === "RUNNING" && s.last_resumed_at) {
      displaySeconds += secondsSince(s.last_resumed_at);
    }
    return { status: 200, body: { ...s, display_seconds: displaySeconds } };
  }

  // POST /api/timer/start
  if (method === "POST" && action === "start") {
    const { assignment_id, milestone_id, notes } = body || {};
    if (!assignment_id) return { status: 400, body: { error: "assignment_id is required." } };

    const existing = await query(
      `SELECT id FROM timer_sessions WHERE user_id = $1 AND status = 'RUNNING'`,
      [userId]
    );
    if (existing.rows.length > 0) {
      return { status: 409, body: { error: "A timer is already running. Pause or stop it first." } };
    }

    const now = new Date().toISOString();
    const res = await query(
      `INSERT INTO timer_sessions
         (user_id, assignment_id, milestone_id, started_at, last_resumed_at, total_seconds_accumulated, status, notes)
       VALUES ($1, $2, $3, $4, $5, 0, 'RUNNING', $6) RETURNING *`,
      [userId, assignment_id, milestone_id || null, now, now, notes || null]
    );
    return { status: 201, body: { ...res.rows[0], display_seconds: 0 } };
  }

  // POST /api/timer/pause
  if (method === "POST" && action === "pause") {
    const session = await query(
      `SELECT * FROM timer_sessions WHERE user_id = $1 AND status = 'RUNNING' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (session.rows.length === 0) return { status: 404, body: { error: "No running timer found." } };
    const s = session.rows[0];
    const currentStretch = s.last_resumed_at ? secondsSince(s.last_resumed_at) : 0;
    const newTotal = s.total_seconds_accumulated + currentStretch;
    const res = await query(
      `UPDATE timer_sessions SET total_seconds_accumulated = $1, status = 'PAUSED', last_resumed_at = NULL, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newTotal, s.id]
    );
    return { status: 200, body: { ...res.rows[0], display_seconds: newTotal } };
  }

  // POST /api/timer/resume
  if (method === "POST" && action === "resume") {
    const session = await query(
      `SELECT * FROM timer_sessions WHERE user_id = $1 AND status = 'PAUSED' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (session.rows.length === 0) return { status: 404, body: { error: "No paused timer found." } };
    const s = session.rows[0];
    const res = await query(
      `UPDATE timer_sessions SET status = 'RUNNING', last_resumed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [s.id]
    );
    return { status: 200, body: { ...res.rows[0], display_seconds: s.total_seconds_accumulated } };
  }

  // POST /api/timer/stop
  if (method === "POST" && action === "stop") {
    const { notes: stopNotes, description } = body || {};

    const session = await query(
      `SELECT ts.*, a.billing_rate, p.name AS project_name
       FROM timer_sessions ts
       LEFT JOIN assignments a ON a.id = ts.assignment_id
       LEFT JOIN projects p ON p.id = a.project_id
       WHERE ts.user_id = $1 AND ts.status IN ('RUNNING', 'PAUSED')
       ORDER BY ts.created_at DESC LIMIT 1`,
      [userId]
    );
    if (session.rows.length === 0) return { status: 404, body: { error: "No active timer found." } };
    const s = session.rows[0];

    let totalSeconds = s.total_seconds_accumulated;
    if (s.status === "RUNNING" && s.last_resumed_at) {
      totalSeconds += secondsSince(s.last_resumed_at);
    }

    const hoursLogged = Math.round((totalSeconds / 3600) * 100) / 100;

    if (hoursLogged < 0.01) {
      await query(`UPDATE timer_sessions SET status = 'STOPPED', total_seconds_accumulated = $1, updated_at = NOW() WHERE id = $2`, [totalSeconds, s.id]);
      return { status: 200, body: { message: "Timer stopped (duration too short to log).", total_seconds: totalSeconds } };
    }

    const entryDate = new Date(s.started_at).toISOString().split("T")[0];
    const weekStart = getMondayOfWeek(entryDate);

    let timesheetId;
    const existingTs = await query(
      `SELECT id FROM timesheets WHERE assignment_id = $1 AND employee_id = $2 AND week_start = $3`,
      [s.assignment_id, userId, weekStart]
    );
    if (existingTs.rows.length > 0) {
      timesheetId = existingTs.rows[0].id;
    } else {
      const newTs = await query(
        `INSERT INTO timesheets (assignment_id, employee_id, week_start, total_hours, work_description, status) VALUES ($1, $2, $3, 0, '', 'DRAFT') RETURNING id`,
        [s.assignment_id, userId, weekStart]
      );
      timesheetId = newTs.rows[0].id;
    }

    const existingEntry = await query(
      `SELECT id, hours FROM timesheet_entries WHERE timesheet_id = $1 AND date = $2`,
      [timesheetId, entryDate]
    );

    let entryId;
    const autoDesc = description || `Timer: ${s.project_name || "Project"} work (${new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;

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
      `UPDATE timer_sessions SET status = 'STOPPED', total_seconds_accumulated = $1, last_resumed_at = NULL, timesheet_entry_id = $2, notes = COALESCE($3, notes), updated_at = NOW() WHERE id = $4`,
      [totalSeconds, entryId, stopNotes || null, s.id]
    );

    return {
      status: 200,
      body: {
        message: `Timer stopped — ${hoursLogged}h logged to your timesheet.`,
        hours_logged: hoursLogged,
        total_seconds: totalSeconds,
        timesheet_id: timesheetId,
        timesheet_entry_id: entryId,
        entry_date: entryDate
      }
    };
  }

  // PATCH /api/timer/heartbeat
  if (method === "PATCH" && action === "heartbeat") {
    const res = await query(
      `UPDATE timer_sessions SET updated_at = NOW() WHERE user_id = $1 AND status = 'RUNNING' RETURNING id, updated_at`,
      [userId]
    );
    if (res.rows.length === 0) return { status: 404, body: { error: "No running timer to heartbeat." } };
    return { status: 200, body: { ok: true, updated_at: res.rows[0].updated_at } };
  }

  return { status: 405, body: { error: "Method Not Allowed" } };
}
