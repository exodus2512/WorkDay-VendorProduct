import { query } from '../db/db.js';
import { logAudit } from '../utils/audit.js';

// Base SELECT query for clients with project aggregations
const CLIENT_SELECT = `
  SELECT c.*,
    COALESCE(COUNT(p.id), 0)::int AS project_count,
    COALESCE(SUM(p.budget), 0)::numeric AS total_budget
  FROM clients c
  LEFT JOIN projects p ON p.client_id = c.id OR p.client_name = c.name
`;

export async function handleClients(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/clients or /api/clients/:id
  const user = req.user; // Authenticated user from JWT

  // ── GET ──────────────────────────────────────────────────────────────────
  if (method === 'GET') {
    if (id) {
      const res = await query(
        `${CLIENT_SELECT} WHERE c.id = $1 GROUP BY c.id`,
        [id]
      );
      if (res.rows.length === 0) {
        return { status: 404, body: { error: 'Client not found' } };
      }
      return { status: 200, body: res.rows[0] };
    }

    const vendorId = queryParams.get('vendor_id') || (user?.vendor_id ? String(user.vendor_id) : null);
    let res;
    if (vendorId) {
      res = await query(
        `${CLIENT_SELECT} WHERE c.vendor_id = $1 GROUP BY c.id ORDER BY c.id DESC`,
        [vendorId]
      );
    } else {
      res = await query(
        `${CLIENT_SELECT} GROUP BY c.id ORDER BY c.id DESC`
      );
    }

    return { status: 200, body: res.rows };
  }

  // ── POST (Create Client) ─────────────────────────────────────────────────
  if (method === 'POST') {
    const body = await req.json();
    const {
      name,
      contact_person,
      contact_email,
      contact_phone,
      industry,
      address,
      status,
      vendor_id
    } = body;

    if (!name || name.trim() === '') {
      return { status: 400, body: { error: 'Client organization name is required.' } };
    }

    const vId = vendor_id || user?.vendor_id || 1;

    const res = await query(
      `INSERT INTO clients (vendor_id, name, contact_person, contact_email, contact_phone, industry, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        vId,
        name.trim(),
        contact_person ? contact_person.trim() : '',
        contact_email ? contact_email.trim() : '',
        contact_phone ? contact_phone.trim() : '',
        industry || 'Technology',
        address ? address.trim() : '',
        status || 'ACTIVE'
      ]
    );

    const newClient = res.rows[0];

    // Audit Log
    await logAudit({
      vendor_id: vId,
      entity_type: 'CLIENT',
      entity_id: newClient.id,
      actor_id: user?.id || null,
      action: 'CREATE_CLIENT',
      new_status: newClient.status,
      metadata: { name: newClient.name, industry: newClient.industry }
    });

    return {
      status: 201,
      body: {
        ...newClient,
        project_count: 0,
        total_budget: 0
      }
    };
  }

  // ── PUT (Update Client) ──────────────────────────────────────────────────
  if (method === 'PUT' && id) {
    const body = await req.json();
    const {
      name,
      contact_person,
      contact_email,
      contact_phone,
      industry,
      address,
      status
    } = body;

    const curr = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (curr.rows.length === 0) {
      return { status: 404, body: { error: 'Client not found' } };
    }

    if (!name || name.trim() === '') {
      return { status: 400, body: { error: 'Client organization name is required.' } };
    }

    const res = await query(
      `UPDATE clients
       SET name = $1, contact_person = $2, contact_email = $3, contact_phone = $4, industry = $5, address = $6, status = $7
       WHERE id = $8 RETURNING *`,
      [
        name.trim(),
        contact_person ? contact_person.trim() : '',
        contact_email ? contact_email.trim() : '',
        contact_phone ? contact_phone.trim() : '',
        industry || 'Technology',
        address ? address.trim() : '',
        status || 'ACTIVE',
        id
      ]
    );

    const updatedClient = res.rows[0];

    // Audit Log
    await logAudit({
      vendor_id: updatedClient.vendor_id,
      entity_type: 'CLIENT',
      entity_id: updatedClient.id,
      actor_id: user?.id || null,
      action: 'UPDATE_CLIENT',
      previous_status: curr.rows[0].status,
      new_status: updatedClient.status,
      metadata: { name: updatedClient.name }
    });

    // Fetch refreshed project stats
    const statsRes = await query(
      `SELECT
         COALESCE(COUNT(p.id), 0)::int AS project_count,
         COALESCE(SUM(p.budget), 0)::numeric AS total_budget
       FROM projects p
       WHERE p.client_id = $1 OR p.client_name = $2`,
      [id, updatedClient.name]
    );

    return {
      status: 200,
      body: {
        ...updatedClient,
        project_count: statsRes.rows[0]?.project_count || 0,
        total_budget: statsRes.rows[0]?.total_budget || 0
      }
    };
  }

  // ── DELETE (Delete Client) ───────────────────────────────────────────────
  if (method === 'DELETE' && id) {
    const curr = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (curr.rows.length === 0) {
      return { status: 404, body: { error: 'Client not found' } };
    }

    const clientToDelete = curr.rows[0];

    // Check if there are active projects associated with this client
    const projectCheck = await query(
      `SELECT id, name FROM projects WHERE (client_id = $1 OR client_name = $2) AND status = 'ACTIVE'`,
      [id, clientToDelete.name]
    );

    if (projectCheck.rows.length > 0) {
      return {
        status: 400,
        body: {
          error: `Cannot delete client "${clientToDelete.name}". It has ${projectCheck.rows.length} active project(s) assigned.`
        }
      };
    }

    await query('DELETE FROM clients WHERE id = $1', [id]);

    // Audit Log
    await logAudit({
      vendor_id: clientToDelete.vendor_id,
      entity_type: 'CLIENT',
      entity_id: parseInt(id, 10),
      actor_id: user?.id || null,
      action: 'DELETE_CLIENT',
      previous_status: clientToDelete.status,
      metadata: { name: clientToDelete.name }
    });

    return {
      status: 200,
      body: { message: `Client "${clientToDelete.name}" deleted successfully.` }
    };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
