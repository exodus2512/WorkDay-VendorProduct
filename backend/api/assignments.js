import { query } from '../db/db.js';

export async function handleAssignments(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/assignments or /api/assignments/:id

  if (method === 'GET') {
    const assignSelect = `
      SELECT a.*,
        p.name AS project_name, p.client_name,
        u.name AS employee_name, u.email AS employee_email,
        pm.name AS pm_name, p.project_manager_id AS pm_id
      FROM assignments a
      LEFT JOIN projects p ON p.id = a.project_id
      LEFT JOIN users u ON u.id = a.employee_id
      LEFT JOIN users pm ON pm.id = p.project_manager_id
    `;

    if (id) {
      const res = await query(`${assignSelect} WHERE a.id = $1`, [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Assignment not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const empId = queryParams.get('employee_id');
    const projId = queryParams.get('project_id');

    let res;
    if (empId) {
      res = await query(`${assignSelect} WHERE a.employee_id = $1 ORDER BY a.id DESC`, [empId]);
    } else if (projId) {
      res = await query(`${assignSelect} WHERE a.project_id = $1 ORDER BY a.id DESC`, [projId]);
    } else {
      res = await query(`${assignSelect} ORDER BY a.id DESC`);
    }
    return { status: 200, body: res.rows };
  }

  if (method === 'POST') {
    const body = await req.json();
    const { project_id, employee_id, role, start_date, end_date, billing_rate, weekly_hour_limit } = body;
    
    if (!project_id || !employee_id || !role || !start_date || !end_date || !billing_rate) {
      return { status: 400, body: { error: 'Missing required assignment parameters.' } };
    }

    // Verify contractor availability
    const empRes = await query('SELECT * FROM users WHERE id = $1', [employee_id]);
    if (empRes.rows.length > 0 && empRes.rows[0].availability === 'UNAVAILABLE') {
      return { status: 400, body: { error: `Cannot assign employee ${empRes.rows[0].name}. Contractor status is set to UNAVAILABLE.` } };
    }

    const res = await query(
      `INSERT INTO assignments (project_id, employee_id, role, start_date, end_date, billing_rate, weekly_hour_limit, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [project_id, employee_id, role, start_date, end_date, billing_rate, weekly_hour_limit || 40, 'ACTIVE']
    );

    // Create system notification for employee
    await query(
      `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
      [employee_id, `You have been assigned to project as ${role} at $${billing_rate}/hr.`, 'ASSIGNMENT_CREATED']
    );

    return { status: 201, body: res.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { role, start_date, end_date, billing_rate, weekly_hour_limit, status } = body;

    const res = await query(
      `UPDATE assignments SET role = $1, start_date = $2, end_date = $3, billing_rate = $4, weekly_hour_limit = $5, status = $6
       WHERE id = $7 RETURNING *`,
      [role, start_date, end_date, billing_rate, weekly_hour_limit, status, id]
    );

    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
