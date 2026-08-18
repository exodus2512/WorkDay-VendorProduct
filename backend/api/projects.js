import { query } from '../db/db.js';

export async function handleProjects(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/projects or /api/projects/:id

  if (method === 'GET') {
    if (id) {
      const res = await query('SELECT * FROM projects WHERE id = $1', [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Project not found' } };
      return { status: 200, body: res.rows[0] };
    }
    
    // Optional filter by PM
    const pmId = queryParams.get('pm_id');
    let res;
    if (pmId) {
      res = await query('SELECT * FROM projects WHERE project_manager_id = $1 ORDER BY id DESC', [pmId]);
    } else {
      res = await query('SELECT * FROM projects ORDER BY id DESC');
    }
    return { status: 200, body: res.rows };
  }

  if (method === 'POST') {
    const body = await req.json();
    const { name, client_name, description, budget, start_date, end_date, status, project_manager_id } = body;
    if (!name || !client_name || !start_date || !end_date) {
      return { status: 400, body: { error: 'Missing required project fields (name, client_name, start_date, end_date)' } };
    }
    const res = await query(
      `INSERT INTO projects (name, client_name, description, budget, start_date, end_date, status, project_manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, client_name, description || '', budget || 0, start_date, end_date, status || 'PENDING', project_manager_id || null]
    );
    return { status: 201, body: res.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { name, client_name, description, budget, start_date, end_date, status, project_manager_id } = body;

    // Direct status or PM update shortcuts
    if (body.action === 'ACCEPT') {
      const res = await query('UPDATE projects SET status = $1 WHERE id = $2 RETURNING *', ['ACTIVE', id]);
      return { status: 200, body: res.rows[0] };
    }
    if (body.action === 'REJECT') {
      const res = await query('UPDATE projects SET status = $1 WHERE id = $2 RETURNING *', ['REJECTED', id]);
      return { status: 200, body: res.rows[0] };
    }
    if (body.action === 'ASSIGN_PM') {
      const res = await query('UPDATE projects SET project_manager_id = $1 WHERE id = $2 RETURNING *', [project_manager_id, id]);
      return { status: 200, body: res.rows[0] };
    }

    const res = await query(
      `UPDATE projects SET name = $1, client_name = $2, description = $3, budget = $4, start_date = $5, end_date = $6, status = $7, project_manager_id = $8
       WHERE id = $9 RETURNING *`,
      [name, client_name, description, budget, start_date, end_date, status, project_manager_id, id]
    );
    return { status: 200, body: res.rows[0] };
  }

  return { status: 450, body: { error: 'Method Not Allowed' } };
}
