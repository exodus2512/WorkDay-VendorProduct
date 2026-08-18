import { query } from '../db/db.js';
import bcrypt from 'bcryptjs';

export async function handleEmployees(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/employees or /api/employees/:id

  if (method === 'GET') {
    if (id) {
      const res = await query(
        'SELECT id, name, email, role, status, skills, availability, weekly_capacity_hours, payout_currency, tax_region, tax_exempt, created_at FROM users WHERE id = $1',
        [id]
      );
      if (res.rows.length === 0) return { status: 404, body: { error: 'Employee not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const role = queryParams.get('role');
    const vendorId = queryParams.get('vendor_id');

    let whereClauses = [];
    let params = [];

    if (role) {
      params.push(role);
      whereClauses.push(`role = $${params.length}`);
    } else {
      whereClauses.push(`role IN ('EMPLOYEE', 'PROJECT_MANAGER', 'VENDOR_ADMIN')`);
    }

    if (vendorId) {
      params.push(vendorId);
      whereClauses.push(`vendor_id = $${params.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const res = await query(
      `SELECT id, name, email, role, status, skills, availability, weekly_capacity_hours, payout_currency, tax_region, tax_exempt, created_at, vendor_id FROM users ${whereStr} ORDER BY name ASC`,
      params
    );

    return { status: 200, body: res.rows };
  }

  if (method === 'POST') {
    const body = await req.json();
    const { name, email, role, status, skills, availability, weekly_capacity_hours, payout_currency, tax_region, tax_exempt, password, vendor_id, client_id } = body;
    if (!name || !email) {
      return { status: 400, body: { error: 'Name and email are required.' } };
    }
    // Always hash the password before storing — never store plain-text
    const rawPassword = password || 'password123';
    const hashedPassword = bcrypt.hashSync(rawPassword, 10);
    const res = await query(
      `INSERT INTO users (name, email, password, role, status, skills, availability, weekly_capacity_hours, payout_currency, tax_region, tax_exempt, vendor_id, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, name, email, role, status, skills, availability, weekly_capacity_hours, payout_currency, tax_region, tax_exempt, vendor_id, client_id, created_at`,
      [
        name, email, hashedPassword,
        role || 'EMPLOYEE',
        status || 'ACTIVE',
        skills || '',
        availability || 'FULL_TIME',
        weekly_capacity_hours !== undefined ? parseInt(weekly_capacity_hours, 10) : 40,
        payout_currency || 'USD',
        tax_region || 'US-DEFAULT',
        tax_exempt === true || tax_exempt === 'true',
        vendor_id || null,
        client_id || null
      ]
    );
    return { status: 201, body: res.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { name, email, skills, availability, status, weekly_capacity_hours, payout_currency, tax_region, tax_exempt } = body;
    const res = await query(
      `UPDATE users SET name = $1, email = $2, skills = $3, availability = $4, status = $5, weekly_capacity_hours = $6, payout_currency = $7, tax_region = $8, tax_exempt = $9
       WHERE id = $10 RETURNING id, name, email, role, status, skills, availability, weekly_capacity_hours, payout_currency, tax_region, tax_exempt, created_at`,
      [
        name, email, skills, availability, status, 
        weekly_capacity_hours !== undefined ? parseInt(weekly_capacity_hours, 10) : 40, 
        payout_currency || 'USD',
        tax_region || 'US-DEFAULT',
        tax_exempt === true || tax_exempt === 'true',
        id
      ]
    );
    if (res.rows.length === 0) return { status: 404, body: { error: 'User not found.' } };
    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
