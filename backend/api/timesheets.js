/**
 * --------------------------------------------------------------------------------
 * TIMESHEETS API HANDLER (/api/timesheets)
 * --------------------------------------------------------------------------------
 * Core Logic & Workflow:
 *  - Manages weekly contractor time logs and daily hour breakdowns (`timesheet_entries`).
 *  - Supports linking timesheet hours directly to a project deliverable via `milestone_id`.
 *  - Timesheet Status Flow: DRAFT -> SUBMITTED -> APPROVED / REJECTED.
 *  - Enforces legal state machine transitions (`isValidTransition('TIMESHEET', ...)`) and logs all actions
 *    to the immutable `audit_log`.
 *  - Dispatches transactional email notifications on submission, approval, and rejection.
 *
 * Supported Operations:
 *  - GET /api/timesheets
 *      Lists timesheets enriched with project, client, employee, and milestone names.
 *      Filterable by `employee_id`, `project_id`, `pm_id`, `status`.
 *  - GET /api/timesheets/:id
 *      Returns a single timesheet along with its daily breakdown (`timesheet_entries`).
 *  - POST /api/timesheets
 *      Creates a new weekly timesheet with daily entry breakdown (Mon-Sun) and optional `milestone_id`.
 *  - PUT /api/timesheets/:id
 *      Updates timesheet hours, descriptions, entries, or status.
 *  - POST /api/timesheets/:id/approve
 *      PM approval action. Updates status to `APPROVED` and notifies the contractor.
 *  - POST /api/timesheets/:id/reject
 *      PM rejection action with mandatory feedback reason.
 * --------------------------------------------------------------------------------
 */
import { query } from '../db/db.js';
import { logAudit } from '../utils/audit.js';
import { isValidTransition } from '../utils/stateMachine.js';
import {
  sendTimesheetSubmitted,
  sendTimesheetApproved,
  sendTimesheetRejected,
} from '../services/notificationService.js';

export async function handleTimesheets(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/timesheets or /api/timesheets/:id
  const action = pathSegments[1]; // e.g. /api/timesheets/:id/approve or /api/timesheets/:id/reject
  const user = req.user; // Set by auth middleware

  if (method === 'GET') {
    if (id && !action) {
      const res = await query(`
        SELECT t.*,
          p.id AS project_id, p.name AS project_name, p.client_name,
          p.project_manager_id AS pm_id,
          u.name AS employee_name,
          m.name AS milestone_name,
          a.billing_rate, a.weekly_hour_limit
        FROM timesheets t
        LEFT JOIN assignments a ON a.id = t.assignment_id
        LEFT JOIN projects p ON p.id = a.project_id
        LEFT JOIN users u ON u.id = t.employee_id
        LEFT JOIN milestones m ON m.id = t.milestone_id
        WHERE t.id = $1
      `, [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };
      
      const ts = res.rows[0];
      const entriesRes = await query('SELECT id, timesheet_id, date, hours, description FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY date ASC', [id]);
      ts.entries = entriesRes.rows;
      return { status: 200, body: ts };
    }

    const empId = queryParams.get('employee_id');
    const pmId = queryParams.get('pm_id');

    let baseQuery = `
      SELECT t.*,
        p.id AS project_id, p.name AS project_name, p.client_name,
        p.project_manager_id AS pm_id,
        u.name AS employee_name,
        m.name AS milestone_name,
        a.billing_rate, a.weekly_hour_limit
      FROM timesheets t
      LEFT JOIN assignments a ON a.id = t.assignment_id
      LEFT JOIN projects p ON p.id = a.project_id
      LEFT JOIN users u ON u.id = t.employee_id
      LEFT JOIN milestones m ON m.id = t.milestone_id
    `;

    let res;
    if (empId && pmId) {
      res = await query(`${baseQuery} WHERE t.employee_id = $1 AND p.project_manager_id = $2 ORDER BY t.id DESC`, [empId, pmId]);
    } else if (empId) {
      res = await query(`${baseQuery} WHERE t.employee_id = $1 ORDER BY t.id DESC`, [empId]);
    } else if (pmId) {
      res = await query(`${baseQuery} WHERE p.project_manager_id = $1 ORDER BY t.id DESC`, [pmId]);
    } else {
      res = await query(`${baseQuery} ORDER BY t.id DESC`);
    }

    const timesheets = res.rows;

    if (timesheets.length > 0) {
      const tsIds = timesheets.map(t => t.id);
      const entriesRes = await query(
        `SELECT id, timesheet_id, date, hours, description FROM timesheet_entries WHERE timesheet_id = ANY($1::int[]) ORDER BY date ASC`,
        [tsIds]
      );
      const entriesByTs = {};
      for (const entry of entriesRes.rows) {
        if (!entriesByTs[entry.timesheet_id]) entriesByTs[entry.timesheet_id] = [];
        entriesByTs[entry.timesheet_id].push(entry);
      }
      for (const t of timesheets) {
        t.entries = entriesByTs[t.id] || [];
      }
    }

    return { status: 200, body: timesheets };
  }

  if (method === 'POST') {
    if (id && action === 'approve') {
      // Fetch current to check transition
      const curr = await query('SELECT status, employee_id, week_start, total_hours FROM timesheets WHERE id = $1', [id]);
      if (curr.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };
      
      if (!isValidTransition('TIMESHEET', curr.rows[0].status, 'APPROVED')) {
        await logAudit({ vendor_id: user?.vendor_id, entity_type: 'TIMESHEET', entity_id: parseInt(id), actor_id: user?.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: 'APPROVED', metadata: { error: 'Invalid state transition' } });
        return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to APPROVED` } };
      }

      // Concurrency check: must currently be SUBMITTED
      const res = await query(
        "UPDATE timesheets SET status = 'APPROVED', rejection_reason = NULL WHERE id = $1 AND status = 'SUBMITTED' RETURNING *",
        [id]
      );
      if (res.rows.length === 0) return { status: 409, body: { error: 'Timesheet state changed concurrently. Please refresh.' } };
      
      const ts = res.rows[0];
      await query(
        "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
        [ts.employee_id, `Your timesheet #${ts.id} (${ts.total_hours} hrs) was APPROVED by Project Manager.`, 'TIMESHEET_APPROVED']
      );

      // Trigger asynchronous email to contractor
      try {
        const empRes = await query('SELECT email FROM users WHERE id = $1', [ts.employee_id]);
        const contractorEmail = empRes.rows[0]?.email;
        if (contractorEmail) {
          await sendTimesheetApproved(contractorEmail, ts.week_start);
        }
      } catch (emailErr) {
        console.error('Failed to dispatch timesheet approved email:', emailErr);
      }

      // Audit Log
      await logAudit({
        vendor_id: user?.vendor_id, entity_type: 'TIMESHEET', entity_id: ts.id, actor_id: user?.id, action: 'APPROVE',
        previous_status: curr.rows[0].status, new_status: 'APPROVED'
      });

      return { status: 200, body: ts };
    }

    if (id && action === 'reject') {
      const body = await req.json();
      const { rejection_reason } = body;

      const curr = await query('SELECT status, employee_id, week_start FROM timesheets WHERE id = $1', [id]);
      if (curr.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };

      if (!isValidTransition('TIMESHEET', curr.rows[0].status, 'REJECTED')) {
        await logAudit({ vendor_id: user?.vendor_id, entity_type: 'TIMESHEET', entity_id: parseInt(id), actor_id: user?.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: 'REJECTED', metadata: { error: 'Invalid state transition' } });
        return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to REJECTED` } };
      }

      // Concurrency check
      const res = await query(
        "UPDATE timesheets SET status = 'REJECTED', rejection_reason = $1 WHERE id = $2 AND status = 'SUBMITTED' RETURNING *",
        [rejection_reason || 'Needs revision.', id]
      );
      if (res.rows.length === 0) return { status: 409, body: { error: 'Timesheet state changed concurrently. Please refresh.' } };

      const ts = res.rows[0];
      await query(
        "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
        [ts.employee_id, `Your timesheet #${ts.id} was REJECTED: ${rejection_reason || 'Needs revision.'}`, 'TIMESHEET_REJECTED']
      );

      // Trigger asynchronous email to contractor
      try {
        const empRes = await query('SELECT email FROM users WHERE id = $1', [ts.employee_id]);
        const contractorEmail = empRes.rows[0]?.email;
        if (contractorEmail) {
          await sendTimesheetRejected(contractorEmail, ts.week_start, rejection_reason || 'Needs revision.');
        }
      } catch (emailErr) {
        console.error('Failed to dispatch timesheet rejected email:', emailErr);
      }

      // Audit Log
      await logAudit({
        vendor_id: user?.vendor_id, entity_type: 'TIMESHEET', entity_id: ts.id, actor_id: user?.id, action: 'REJECT',
        previous_status: curr.rows[0].status, new_status: 'REJECTED', metadata: { rejection_reason }
      });

      return { status: 200, body: ts };
    }

    // Create or submit new timesheet
    const body = await req.json();
    const { assignment_id, employee_id, week_start, total_hours, work_description, status, entries, milestone_id } = body;

    if (!assignment_id || !employee_id || !week_start) {
      return { status: 400, body: { error: 'Missing required timesheet fields.' } };
    }

    const res = await query(
      `INSERT INTO timesheets (assignment_id, employee_id, week_start, total_hours, work_description, status, milestone_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [assignment_id, employee_id, week_start, total_hours || 0, work_description || '', status || 'DRAFT', milestone_id || null]
    );

    const newTs = res.rows[0];

    if (entries && Array.isArray(entries)) {
      for (const entry of entries) {
        await query(
          `INSERT INTO timesheet_entries (timesheet_id, date, hours, description) VALUES ($1, $2, $3, $4)`,
          [newTs.id, entry.date, entry.hours || 0, entry.description || '']
        );
      }
    }

    // Return joined row so the frontend list renders with project_name, billing_rate, etc.
    const joinedRes = await query(`
      SELECT t.*,
        p.id AS project_id, p.name AS project_name, p.client_name,
        p.project_manager_id AS pm_id,
        u.name AS employee_name,
        m.name AS milestone_name,
        a.billing_rate, a.weekly_hour_limit
      FROM timesheets t
      LEFT JOIN assignments a ON a.id = t.assignment_id
      LEFT JOIN projects p ON p.id = a.project_id
      LEFT JOIN users u ON u.id = t.employee_id
      LEFT JOIN milestones m ON m.id = t.milestone_id
      WHERE t.id = $1
    `, [newTs.id]);

    // If timesheet was directly submitted, dispatch email notification to Project Manager
    if (newTs.status === 'SUBMITTED') {
      try {
        const pmId = joinedRes.rows[0]?.pm_id;
        if (pmId) {
          const pmRes = await query('SELECT email FROM users WHERE id = $1', [pmId]);
          const pmEmail = pmRes.rows[0]?.email;
          const contractorName = joinedRes.rows[0]?.employee_name || 'Contractor';
          const hours = joinedRes.rows[0]?.total_hours || total_hours || 0;
          if (pmEmail) {
            await sendTimesheetSubmitted(pmEmail, contractorName, hours);
          }
        }
      } catch (emailErr) {
        console.error('Failed to dispatch timesheet submitted email:', emailErr);
      }
    }

    // Audit Log
    await logAudit({
      vendor_id: user?.vendor_id, entity_type: 'TIMESHEET', entity_id: newTs.id, actor_id: user?.id, action: 'CREATE',
      new_status: newTs.status
    });

    return { status: 201, body: joinedRes.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { total_hours, work_description, status, entries, rejection_reason, milestone_id } = body;

    const curr = await query('SELECT status FROM timesheets WHERE id = $1', [id]);
    if (curr.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };

    if (!isValidTransition('TIMESHEET', curr.rows[0].status, status)) {
      await logAudit({ vendor_id: user?.vendor_id, entity_type: 'TIMESHEET', entity_id: parseInt(id), actor_id: user?.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: status, metadata: { error: 'Invalid state transition' } });
      return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to ${status}` } };
    }

    const res = await query(
      `UPDATE timesheets SET total_hours = $1, work_description = $2, status = $3, rejection_reason = $4, milestone_id = $5
       WHERE id = $6 RETURNING *`,
      [total_hours, work_description, status, status === 'SUBMITTED' ? null : rejection_reason, milestone_id || null, id]
    );

    if (entries && Array.isArray(entries)) {
      await query('DELETE FROM timesheet_entries WHERE timesheet_id = $1', [id]);
      for (const entry of entries) {
        await query(
          `INSERT INTO timesheet_entries (timesheet_id, date, hours, description) VALUES ($1, $2, $3, $4)`,
          [id, entry.date, entry.hours || 0, entry.description || '']
        );
      }
    }

    const updatedTs = res.rows[0];

    // Trigger emails for state transitions in PUT
    try {
      if (status === 'SUBMITTED' && curr.rows[0].status !== 'SUBMITTED') {
        const joinedRes = await query(`
          SELECT t.*, p.project_manager_id AS pm_id, u.name AS employee_name
          FROM timesheets t
          LEFT JOIN assignments a ON a.id = t.assignment_id
          LEFT JOIN projects p ON p.id = a.project_id
          LEFT JOIN users u ON u.id = t.employee_id
          WHERE t.id = $1
        `, [id]);
        if (joinedRes.rows.length > 0 && joinedRes.rows[0].pm_id) {
          const pmRes = await query('SELECT email FROM users WHERE id = $1', [joinedRes.rows[0].pm_id]);
          const pmEmail = pmRes.rows[0]?.email;
          if (pmEmail) {
            await sendTimesheetSubmitted(pmEmail, joinedRes.rows[0].employee_name || 'Contractor', updatedTs.total_hours);
          }
        }
      } else if (status === 'APPROVED' && curr.rows[0].status !== 'APPROVED') {
        const empRes = await query('SELECT email FROM users WHERE id = $1', [updatedTs.employee_id]);
        if (empRes.rows[0]?.email) {
          await sendTimesheetApproved(empRes.rows[0].email, updatedTs.week_start);
        }
      } else if (status === 'REJECTED' && curr.rows[0].status !== 'REJECTED') {
        const empRes = await query('SELECT email FROM users WHERE id = $1', [updatedTs.employee_id]);
        if (empRes.rows[0]?.email) {
          await sendTimesheetRejected(empRes.rows[0].email, updatedTs.week_start, rejection_reason || 'Needs revision.');
        }
      }
    } catch (emailErr) {
      console.error('Failed to dispatch timesheet status email:', emailErr);
    }

    // Audit Log
    await logAudit({
      vendor_id: user?.vendor_id, entity_type: 'TIMESHEET', entity_id: parseInt(id), actor_id: user?.id, action: 'UPDATE',
      previous_status: curr.rows[0].status, new_status: status
    });

    return { status: 200, body: updatedTs };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
