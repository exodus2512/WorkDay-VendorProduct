import { query } from '../db/db.js';

export async function handleMilestones(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/milestones or /api/milestones/:id
  const action = pathSegments[1]; // /api/milestones/:id/approve or reject

  if (method === 'GET') {
    if (id && !action) {
      const res = await query('SELECT * FROM milestones WHERE id = $1', [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Milestone not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const projId = queryParams.get('project_id');
    const pmId = queryParams.get('pm_id');

    let res = await query('SELECT * FROM milestones ORDER BY due_date ASC');
    let rows = res.rows;

    if (projId) {
      rows = rows.filter(m => m.project_id === parseInt(projId, 10));
    }
    if (pmId) {
      rows = rows.filter(m => m.pm_id === parseInt(pmId, 10));
    }

    return { status: 200, body: rows };
  }

  if (method === 'POST') {
    if (id && action === 'approve') {
      const res = await query(
        "UPDATE milestones SET status = 'APPROVED', rejection_reason = NULL WHERE id = $1 RETURNING *",
        [id]
      );
      if (res.rows.length === 0) return { status: 404, body: { error: 'Milestone not found' } };
      const m = res.rows[0];

      if (m.submitted_by) {
        await query(
          "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
          [m.submitted_by, `Milestone "${m.name}" ($${m.amount}) was APPROVED.`, 'MILESTONE_APPROVED']
        );
      }

      return { status: 200, body: res.rows[0] };
    }

    if (id && action === 'reject') {
      const body = await req.json();
      const { rejection_reason } = body;
      const res = await query(
        "UPDATE milestones SET status = 'REJECTED', rejection_reason = $1 WHERE id = $2 RETURNING *",
        [rejection_reason || 'Revisions required.', id]
      );
      if (res.rows.length === 0) return { status: 404, body: { error: 'Milestone not found' } };
      const m = res.rows[0];

      if (m.submitted_by) {
        await query(
          "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
          [m.submitted_by, `Milestone "${m.name}" was REJECTED: ${rejection_reason || 'Revisions required.'}`, 'MILESTONE_REJECTED']
        );
      }

      return { status: 200, body: res.rows[0] };
    }

    // Create new milestone
    const body = await req.json();
    const { project_id, name, description, amount, due_date, status } = body;

    if (!project_id || !name || !amount || !due_date) {
      return { status: 400, body: { error: 'Missing required milestone fields.' } };
    }

    const res = await query(
      `INSERT INTO milestones (project_id, name, description, amount, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id, name, description || '', amount, due_date, status || 'PENDING']
    );

    return { status: 201, body: res.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { status, submitted_by, evidence, rejection_reason } = body;

    // Submit milestone completion with evidence
    if (body.action === 'SUBMIT') {
      const res = await query(
        `UPDATE milestones SET status = 'SUBMITTED', submitted_by = $1, evidence = $2 WHERE id = $3 RETURNING *`,
        [submitted_by, evidence, id]
      );
      return { status: 200, body: res.rows[0] };
    }

    const res = await query(
      `UPDATE milestones SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *`,
      [status, rejection_reason || null, id]
    );

    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
