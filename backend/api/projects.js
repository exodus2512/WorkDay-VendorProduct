import { query } from '../db/db.js';

// Reusable JOIN query — always returns pm_name alongside every project row
const PROJECT_SELECT = `
  SELECT p.*, u.name AS pm_name
  FROM projects p
  LEFT JOIN users u ON u.id = p.project_manager_id
`;

// Helper: fetch a single project with pm_name after a mutation
async function fetchProjectById(projectId) {
  const r = await query(`${PROJECT_SELECT} WHERE p.id = $1`, [projectId]);
  return r.rows[0] || null;
}

export async function handleProjects(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/projects or /api/projects/:id

  // ── GET ──────────────────────────────────────────────────────────────────
  if (method === 'GET') {
    if (id) {
      const res = await query(`${PROJECT_SELECT} WHERE p.id = $1`, [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Project not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const pmId = queryParams.get('pm_id');
    let res;
    if (pmId) {
      res = await query(`${PROJECT_SELECT} WHERE p.project_manager_id = $1 ORDER BY p.id DESC`, [pmId]);
    } else {
      res = await query(`${PROJECT_SELECT} ORDER BY p.id DESC`);
    }
    return { status: 200, body: res.rows };
  }

  // ── POST (Create) ─────────────────────────────────────────────────────────
  if (method === 'POST') {
    const body = await req.json();
    const { name, client_name, description, budget, start_date, end_date, status, project_manager_id } = body;

    if (!name || !client_name || !start_date || !end_date) {
      return { status: 400, body: { error: 'Missing required fields: name, client_name, start_date, end_date' } };
    }

    const insert = await query(
      `INSERT INTO projects (name, client_name, description, budget, start_date, end_date, status, project_manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, client_name, description || '', budget || 0, start_date, end_date, status || 'PENDING', project_manager_id || null]
    );

    // Return the full joined row so the frontend renders pm_name immediately
    const created = await fetchProjectById(insert.rows[0].id);
    return { status: 201, body: created };
  }

  // ── PUT (Update / Status Change / Assign PM) ──────────────────────────────
  if (method === 'PUT' && id) {
    const body = await req.json();

    if (body.action === 'ACCEPT') {
      await query("UPDATE projects SET status = 'ACTIVE' WHERE id = $1", [id]);
      return { status: 200, body: await fetchProjectById(id) };
    }

    if (body.action === 'REJECT') {
      await query("UPDATE projects SET status = 'REJECTED' WHERE id = $1", [id]);
      return { status: 200, body: await fetchProjectById(id) };
    }

    if (body.action === 'ASSIGN_PM') {
      const { project_manager_id } = body;
      if (!project_manager_id) {
        return { status: 400, body: { error: 'project_manager_id is required.' } };
      }
      await query('UPDATE projects SET project_manager_id = $1 WHERE id = $2', [project_manager_id, id]);
      return { status: 200, body: await fetchProjectById(id) };
    }

    // Full field update
    const { name, client_name, description, budget, start_date, end_date, status, project_manager_id } = body;
    await query(
      `UPDATE projects SET name = $1, client_name = $2, description = $3, budget = $4,
         start_date = $5, end_date = $6, status = $7, project_manager_id = $8
       WHERE id = $9`,
      [name, client_name, description, budget, start_date, end_date, status, project_manager_id, id]
    );
    return { status: 200, body: await fetchProjectById(id) };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
