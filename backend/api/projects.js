import { query } from '../db/db.js';

// Reusable JOIN query — returns pm_name and vendor/client info alongside every project row
const PROJECT_SELECT = `
  SELECT p.*, u.name AS pm_name, v.name AS vendor_name, c.name AS client_org_name
  FROM projects p
  LEFT JOIN users u ON u.id = p.project_manager_id
  LEFT JOIN vendors v ON v.id = p.vendor_id
  LEFT JOIN clients c ON c.id = p.client_id
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
    const vendorId = queryParams.get('vendor_id');
    const clientId = queryParams.get('client_id');

    let whereClauses = [];
    let params = [];

    if (vendorId) {
      params.push(vendorId);
      whereClauses.push(`p.vendor_id = $${params.length}`);
    }
    if (clientId) {
      params.push(clientId);
      whereClauses.push(`p.client_id = $${params.length}`);
    }
    if (pmId) {
      params.push(pmId);
      whereClauses.push(`p.project_manager_id = $${params.length}`);
    }

    let whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const res = await query(`${PROJECT_SELECT} ${whereStr} ORDER BY p.id DESC`, params);

    return { status: 200, body: res.rows };
  }

  // ── POST (Create) ─────────────────────────────────────────────────────────
  if (method === 'POST') {
    const body = await req.json();
    const { name, client_name, description, budget, start_date, end_date, status, project_manager_id, vendor_id, client_id } = body;

    if (!name || !client_name || !start_date || !end_date) {
      return { status: 400, body: { error: 'Missing required fields: name, client_name, start_date, end_date' } };
    }

    const insert = await query(
      `INSERT INTO projects (vendor_id, client_id, name, client_name, description, budget, start_date, end_date, status, project_manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [vendor_id || 1, client_id || 1, name, client_name, description || '', budget || 0, start_date, end_date, status || 'PENDING', project_manager_id || null]
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
    const { name, client_name, description, budget, start_date, end_date, status, project_manager_id, vendor_id, client_id } = body;
    await query(
      `UPDATE projects SET name = $1, client_name = $2, description = $3, budget = $4,
         start_date = $5, end_date = $6, status = $7, project_manager_id = $8,
         vendor_id = COALESCE($9, vendor_id), client_id = COALESCE($10, client_id)
       WHERE id = $11`,
      [name, client_name, description, budget, start_date, end_date, status, project_manager_id, vendor_id || null, client_id || null, id]
    );
    return { status: 200, body: await fetchProjectById(id) };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
