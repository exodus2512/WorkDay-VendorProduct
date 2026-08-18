import { query } from '../db/db.js';

export async function handlePayrolls(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/payrolls or /api/payrolls/:id

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
    const res = await query(
      `UPDATE contractor_payrolls SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (res.rows.length === 0) return { status: 404, body: { error: 'Payroll entry not found' } };
    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
