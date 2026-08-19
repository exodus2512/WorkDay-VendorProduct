/**
 * --------------------------------------------------------------------------------
 * AUDIT LOG API HANDLER (/api/audit-log)
 * --------------------------------------------------------------------------------
 * Core Logic & Workflow:
 *  - Provides a read-only compliance view of all state transitions and system actions.
 *  - Enforces strict multi-tenant isolation using `vendor_id` from JWT claims.
 *  - Joins `audit_log` records with `users` to display human-readable actor names and emails.
 *
 * Supported Operations:
 *  - GET /api/audit-log
 *      Returns audit entries filtered by vendor. Optional filters: `entity_type` (e.g. TIMESHEET,
 *      MILESTONE, INVOICE), `entity_id`. Ordered chronologically descending.
 * --------------------------------------------------------------------------------
 */
import { query } from '../db/db.js';

export async function handleAuditLog(req, queryParams) {
  const method = req.method;
  const user = req.user; // Authenticated user from JWT

  if (method === 'GET') {
    // Strictly isolate by vendor_id from JWT
    const vendor_id = user.vendor_id;
    if (!vendor_id) {
      return { status: 403, body: { error: 'Vendor context required' } };
    }

    const entity_type = queryParams.get('entity_type');
    const entity_id = queryParams.get('entity_id');

    let sql = `
      SELECT a.*, u.name as actor_name, u.email as actor_email
      FROM audit_log a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE a.vendor_id = $1
    `;
    const params = [vendor_id];

    if (entity_type) {
      params.push(entity_type);
      sql += ` AND a.entity_type = $${params.length}`;
    }

    if (entity_id) {
      params.push(entity_id);
      sql += ` AND a.entity_id = $${params.length}`;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT 100`;

    try {
      const res = await query(sql, params);
      return { status: 200, body: res.rows };
    } catch (error) {
      console.error('Audit Log GET Error:', error);
      return { status: 500, body: { error: 'Internal Server Error' } };
    }
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
