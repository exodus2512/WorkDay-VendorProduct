import { query } from '../db/db.js';
import { logAudit } from '../utils/audit.js';
import { isValidTransition } from '../utils/stateMachine.js';

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
          a.billing_rate, a.weekly_hour_limit
        FROM timesheets t
        LEFT JOIN assignments a ON a.id = t.assignment_id
        LEFT JOIN projects p ON p.id = a.project_id
        LEFT JOIN users u ON u.id = t.employee_id
        WHERE t.id = $1
      `, [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const empId = queryParams.get('employee_id');
    const pmId = queryParams.get('pm_id');

    let baseQuery = `
      SELECT t.*,
        p.id AS project_id, p.name AS project_name, p.client_name,
        p.project_manager_id AS pm_id,
        u.name AS employee_name,
        a.billing_rate, a.weekly_hour_limit
      FROM timesheets t
      LEFT JOIN assignments a ON a.id = t.assignment_id
      LEFT JOIN projects p ON p.id = a.project_id
      LEFT JOIN users u ON u.id = t.employee_id
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

    return { status: 200, body: res.rows };
  }

  if (method === 'POST') {
    if (id && action === 'approve') {
      // Fetch current to check transition
      const curr = await query('SELECT status FROM timesheets WHERE id = $1', [id]);
      if (curr.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };
      
      if (!isValidTransition('TIMESHEET', curr.rows[0].status, 'APPROVED')) {
        await logAudit({ vendor_id: user.vendor_id, entity_type: 'TIMESHEET', entity_id: parseInt(id), actor_id: user.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: 'APPROVED', metadata: { error: 'Invalid state transition' } });
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

      // Audit Log
      await logAudit({
        vendor_id: user.vendor_id, entity_type: 'TIMESHEET', entity_id: ts.id, actor_id: user.id, action: 'APPROVE',
        previous_status: curr.rows[0].status, new_status: 'APPROVED'
      });

      return { status: 200, body: ts };
    }

    if (id && action === 'reject') {
      const body = await req.json();
      const { rejection_reason } = body;

      const curr = await query('SELECT status FROM timesheets WHERE id = $1', [id]);
      if (curr.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };

      if (!isValidTransition('TIMESHEET', curr.rows[0].status, 'REJECTED')) {
        await logAudit({ vendor_id: user.vendor_id, entity_type: 'TIMESHEET', entity_id: parseInt(id), actor_id: user.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: 'REJECTED', metadata: { error: 'Invalid state transition' } });
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

      // Audit Log
      await logAudit({
        vendor_id: user.vendor_id, entity_type: 'TIMESHEET', entity_id: ts.id, actor_id: user.id, action: 'REJECT',
        previous_status: curr.rows[0].status, new_status: 'REJECTED', metadata: { rejection_reason }
      });

      return { status: 200, body: ts };
    }

    // Create or submit new timesheet
    const body = await req.json();
    const { assignment_id, employee_id, week_start, total_hours, work_description, status, entries } = body;

    if (!assignment_id || !employee_id || !week_start) {
      return { status: 400, body: { error: 'Missing required timesheet fields.' } };
    }

    const res = await query(
      `INSERT INTO timesheets (assignment_id, employee_id, week_start, total_hours, work_description, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [assignment_id, employee_id, week_start, total_hours || 0, work_description || '', status || 'DRAFT']
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

    // Audit Log
    await logAudit({
      vendor_id: user.vendor_id, entity_type: 'TIMESHEET', entity_id: newTs.id, actor_id: user.id, action: 'CREATE',
      new_status: newTs.status
    });

    // Return joined row so the frontend list renders with project_name, billing_rate, etc.
    const joinedRes = await query(`
      SELECT t.*,
        p.id AS project_id, p.name AS project_name, p.client_name,
        p.project_manager_id AS pm_id,
        u.name AS employee_name,
        a.billing_rate, a.weekly_hour_limit
      FROM timesheets t
      LEFT JOIN assignments a ON a.id = t.assignment_id
      LEFT JOIN projects p ON p.id = a.project_id
      LEFT JOIN users u ON u.id = t.employee_id
      WHERE t.id = $1
    `, [newTs.id]);

    return { status: 201, body: joinedRes.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { total_hours, work_description, status, entries, rejection_reason } = body;

    const curr = await query('SELECT status FROM timesheets WHERE id = $1', [id]);
    if (curr.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };

    if (!isValidTransition('TIMESHEET', curr.rows[0].status, status)) {
      await logAudit({ vendor_id: user.vendor_id, entity_type: 'TIMESHEET', entity_id: parseInt(id), actor_id: user.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: status, metadata: { error: 'Invalid state transition' } });
      return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to ${status}` } };
    }

    const res = await query(
      `UPDATE timesheets SET total_hours = $1, work_description = $2, status = $3, rejection_reason = $4
       WHERE id = $5 RETURNING *`,
      [total_hours, work_description, status, status === 'SUBMITTED' ? null : rejection_reason, id]
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

    // Audit Log
    await logAudit({
      vendor_id: user.vendor_id, entity_type: 'TIMESHEET', entity_id: parseInt(id), actor_id: user.id, action: 'UPDATE',
      previous_status: curr.rows[0].status, new_status: status
    });

    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
