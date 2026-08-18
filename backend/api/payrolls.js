import { query } from '../db/db.js';
import { logAudit } from '../utils/audit.js';
import { isValidTransition } from '../utils/stateMachine.js';

export async function handlePayrolls(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/payrolls or /api/payrolls/:id
  const user = req.user; // Authenticated user from JWT

  if (method === 'GET') {
    const payrollSelect = `
      SELECT cp.*,
        u.name AS employee_name, u.email AS employee_email,
        p.name AS project_name, p.client_name,
        m.name AS milestone_name
      FROM contractor_payrolls cp
      LEFT JOIN users u ON u.id = cp.employee_id
      LEFT JOIN projects p ON p.id = cp.project_id
      LEFT JOIN milestones m ON m.id = cp.milestone_id
    `;

    if (id) {
      const res = await query(`${payrollSelect} WHERE cp.id = $1`, [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Payroll entry not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const empId = queryParams.get('employee_id');
    const projId = queryParams.get('project_id');

    let res;
    if (empId) {
      res = await query(`${payrollSelect} WHERE cp.employee_id = $1 ORDER BY cp.id DESC`, [empId]);
    } else if (projId) {
      res = await query(`${payrollSelect} WHERE cp.project_id = $1 ORDER BY cp.id DESC`, [projId]);
    } else {
      res = await query(`${payrollSelect} ORDER BY cp.id DESC`);
    }

    return { status: 200, body: res.rows };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { status } = body;

    const curr = await query('SELECT status FROM contractor_payrolls WHERE id = $1', [id]);
    if (curr.rows.length === 0) return { status: 404, body: { error: 'Payroll entry not found' } };

    if (!isValidTransition('PAYROLL', curr.rows[0].status, status)) {
      await logAudit({ vendor_id: user.vendor_id, entity_type: 'PAYROLL', entity_id: parseInt(id), actor_id: user.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: status, metadata: { error: 'Invalid state transition' } });
      return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to ${status}` } };
    }

    const res = await query(
      `UPDATE contractor_payrolls SET status = $1 WHERE id = $2 AND status = $3 RETURNING *`,
      [status, id, curr.rows[0].status]
    );
    if (res.rows.length === 0) return { status: 409, body: { error: 'Payroll state changed concurrently' } };

    // Audit Log
    await logAudit({
      vendor_id: user.vendor_id, entity_type: 'PAYROLL', entity_id: parseInt(id), actor_id: user.id, action: 'UPDATE',
      previous_status: curr.rows[0].status, new_status: status
    });

    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
