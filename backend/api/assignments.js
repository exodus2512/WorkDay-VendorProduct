/**
 * --------------------------------------------------------------------------------
 * ASSIGNMENTS API HANDLER (/api/assignments)
 * --------------------------------------------------------------------------------
 * Core Logic & Workflow:
 *  - Manages the mapping between contractors (EMPLOYEE) and client projects.
 *  - Defines contractual role, start/end dates, hourly billing rate, weekly hour limits,
 *    and optional locked fixed exchange rates for multi-currency payroll.
 *  - Maintains historical versioning in `assignment_rate_history` whenever billing rates are updated.
 *
 * Supported Operations:
 *  - GET /api/assignments
 *      Returns all assignments enriched with project, client, employee, and PM details.
 *      Supports query filters: `employee_id`, `project_id`, `pm_id`, `status`.
 *  - GET /api/assignments/:id
 *      Returns a single assignment by ID.
 *  - POST /api/assignments
 *      Creates a new contractor assignment. Automatically initializes a record in `assignment_rate_history`.
 *  - PUT /api/assignments/:id
 *      Updates assignment role, dates, weekly limit, status, or billing rate.
 *      If billing rate changes, inserts a new versioned entry in `assignment_rate_history`.
 * --------------------------------------------------------------------------------
 */
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
    const { project_id, employee_id, role, start_date, end_date, billing_rate, weekly_hour_limit, fixed_exchange_rate } = body;
    
    if (!project_id || !employee_id || !role || !start_date || !end_date || !billing_rate) {
      return { status: 400, body: { error: 'Missing required assignment parameters.' } };
    }

    // Verify contractor availability
    const empRes = await query('SELECT * FROM users WHERE id = $1', [employee_id]);
    if (empRes.rows.length > 0 && empRes.rows[0].availability === 'UNAVAILABLE') {
      return { status: 400, body: { error: `Cannot assign employee ${empRes.rows[0].name}. Contractor status is set to UNAVAILABLE.` } };
    }

    // Fetch project name for the notification
    const projRes = await query('SELECT name FROM projects WHERE id = $1', [project_id]);
    const projectName = projRes.rows[0]?.name || 'a project';

    const insertRes = await query(
      `INSERT INTO assignments (project_id, employee_id, role, start_date, end_date, billing_rate, weekly_hour_limit, status, fixed_exchange_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        project_id, 
        employee_id, 
        role, 
        start_date, 
        end_date, 
        billing_rate, 
        weekly_hour_limit || 40, 
        'ACTIVE',
        fixed_exchange_rate !== undefined && fixed_exchange_rate !== null && fixed_exchange_rate !== '' ? parseFloat(fixed_exchange_rate) : null
      ]
    );

    const newId = insertRes.rows[0].id;
    const user = req.user; // from JWT

    // Rate versioning: Insert initial rate into history
    await query(
      `INSERT INTO assignment_rate_history (assignment_id, rate, effective_from, effective_to, created_by)
       VALUES ($1, $2, $3, NULL, $4)`,
      [newId, billing_rate, start_date, user?.id || null]
    );

    // Notify the employee with the actual project name
    await query(
      `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
      [employee_id, `You have been assigned to "${projectName}" as ${role} at $${billing_rate}/hr.`, 'ASSIGNMENT_CREATED']
    );

    // Return joined row so frontend table renders correctly without a full refresh
    const finalRes = await query(`
      SELECT a.*,
        p.name AS project_name, p.client_name,
        u.name AS employee_name, u.email AS employee_email,
        pm.name AS pm_name, p.project_manager_id AS pm_id
      FROM assignments a
      LEFT JOIN projects p ON p.id = a.project_id
      LEFT JOIN users u ON u.id = a.employee_id
      LEFT JOIN users pm ON pm.id = p.project_manager_id
      WHERE a.id = $1
    `, [newId]);

    return { status: 201, body: finalRes.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { role, start_date, end_date, billing_rate, weekly_hour_limit, status, fixed_exchange_rate } = body;

    const currRes = await query('SELECT billing_rate FROM assignments WHERE id = $1', [id]);
    const currentRate = parseFloat(currRes.rows[0]?.billing_rate || 0);
    const newRate = parseFloat(billing_rate);
    const user = req.user;

    const res = await query(
      `UPDATE assignments SET role = $1, start_date = $2, end_date = $3, billing_rate = $4, weekly_hour_limit = $5, status = $6, fixed_exchange_rate = $7
       WHERE id = $8 RETURNING *`,
      [
        role, 
        start_date, 
        end_date, 
        billing_rate, 
        weekly_hour_limit, 
        status, 
        fixed_exchange_rate !== undefined && fixed_exchange_rate !== null && fixed_exchange_rate !== '' ? parseFloat(fixed_exchange_rate) : null,
        id
      ]
    );

    // Rate versioning: If rate changed, close old rate history and start new one
    if (currentRate !== newRate) {
      const today = new Date().toISOString().split('T')[0];
      // Close open rate
      await query(
        `UPDATE assignment_rate_history SET effective_to = $1 WHERE assignment_id = $2 AND effective_to IS NULL`,
        [today, id]
      );
      // Insert new rate
      await query(
        `INSERT INTO assignment_rate_history (assignment_id, rate, effective_from, effective_to, created_by)
         VALUES ($1, $2, $3, NULL, $4)`,
        [id, newRate, today, user?.id || null]
      );
    }

    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
