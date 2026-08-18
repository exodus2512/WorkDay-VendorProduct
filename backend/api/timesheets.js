import { query } from '../db/db.js';

export async function handleTimesheets(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/timesheets or /api/timesheets/:id
  const action = pathSegments[1]; // e.g. /api/timesheets/:id/approve or /api/timesheets/:id/reject

  if (method === 'GET') {
    if (id && !action) {
      const res = await query('SELECT * FROM timesheets WHERE id = $1', [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const empId = queryParams.get('employee_id');
    const pmId = queryParams.get('pm_id');

    let res = await query('SELECT * FROM timesheets ORDER BY id DESC');
    let rows = res.rows;

    if (empId) {
      rows = rows.filter(t => t.employee_id === parseInt(empId, 10));
    }
    if (pmId) {
      rows = rows.filter(t => t.pm_id === parseInt(pmId, 10));
    }

    return { status: 200, body: rows };
  }

  if (method === 'POST') {
    if (id && action === 'approve') {
      const res = await query(
        "UPDATE timesheets SET status = 'APPROVED', rejection_reason = NULL WHERE id = $1 RETURNING *",
        [id]
      );
      if (res.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };
      
      const ts = res.rows[0];
      await query(
        "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
        [ts.employee_id, `Your timesheet #${ts.id} (${ts.total_hours} hrs) was APPROVED by Project Manager.`, 'TIMESHEET_APPROVED']
      );

      return { status: 200, body: res.rows[0] };
    }

    if (id && action === 'reject') {
      const body = await req.json();
      const { rejection_reason } = body;
      const res = await query(
        "UPDATE timesheets SET status = 'REJECTED', rejection_reason = $1 WHERE id = $2 RETURNING *",
        [rejection_reason || 'Needs revision.', id]
      );
      if (res.rows.length === 0) return { status: 404, body: { error: 'Timesheet not found' } };

      const ts = res.rows[0];
      await query(
        "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
        [ts.employee_id, `Your timesheet #${ts.id} was REJECTED: ${rejection_reason || 'Needs revision.'}`, 'TIMESHEET_REJECTED']
      );

      return { status: 200, body: res.rows[0] };
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

    return { status: 201, body: newTs };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { total_hours, work_description, status, entries, rejection_reason } = body;

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

    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
