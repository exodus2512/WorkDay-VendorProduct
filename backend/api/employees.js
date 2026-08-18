import { query } from '../db/db.js';
import bcrypt from 'bcryptjs';

export async function handleEmployees(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/employees or /api/employees/:id

  if (method === 'GET') {
    if (id) {
      const res = await query(
        'SELECT id, name, email, role, status, skills, availability, created_at FROM users WHERE id = $1',
        [id]
      );
      if (res.rows.length === 0) return { status: 404, body: { error: 'Employee not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const role = queryParams.get('role');
    let res;
    if (role) {
      // Specific role filter (e.g. ?role=PROJECT_MANAGER for PM dropdown)
      res = await query(
        'SELECT id, name, email, role, status, skills, availability, created_at FROM users WHERE role = $1 ORDER BY name ASC',
        [role]
      );
    } else {
      // Default: return all operational users (exclude CLIENT accounts from workforce list)
      res = await query(
        "SELECT id, name, email, role, status, skills, availability, created_at FROM users WHERE role IN ('EMPLOYEE', 'PROJECT_MANAGER', 'VENDOR_ADMIN') ORDER BY name ASC"
      );
    }
    return { status: 200, body: res.rows };
  }

  if (method === 'POST') {
    const body = await req.json();
    const { name, email, role, status, skills, availability, password } = body;
    if (!name || !email) {
      return { status: 400, body: { error: 'Name and email are required.' } };
    }
    // Always hash the password before storing — never store plain-text
    const rawPassword = password || 'password123';
    const hashedPassword = bcrypt.hashSync(rawPassword, 10);
    const res = await query(
      `INSERT INTO users (name, email, password, role, status, skills, availability)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, status, skills, availability, created_at`,
      [name, email, hashedPassword, role || 'EMPLOYEE', status || 'ACTIVE', skills || '', availability || 'FULL_TIME']
    );
    return { status: 201, body: res.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { name, email, skills, availability, status } = body;
    const res = await query(
      `UPDATE users SET name = $1, email = $2, skills = $3, availability = $4, status = $5
       WHERE id = $6 RETURNING id, name, email, role, status, skills, availability, created_at`,
      [name, email, skills, availability, status, id]
    );
    if (res.rows.length === 0) return { status: 404, body: { error: 'User not found.' } };
    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
