import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../db/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'workforce_vendor_product_secret_key_2026';

export async function handleAuth(req, pathSegments) {
  const method = req.method;
  const action = pathSegments[0]; // /api/auth/login or /api/auth/me

  if (method === 'POST' && action === 'login') {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return { status: 400, body: { error: 'Email and password are required.' } };
    }

    const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (res.rows.length === 0) {
      return { status: 401, body: { error: 'Invalid email or password.' } };
    }

    const user = res.rows[0];

    // Verify password — supports bcrypt hashed passwords
    // Falls back to plain-text comparison for legacy records during migration
    const storedPassword = user.password || '';
    let validPassword = false;
    if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
      validPassword = bcrypt.compareSync(password.trim(), storedPassword);
    } else {
      validPassword = storedPassword === password.trim();
    }

    if (!validPassword) {
      return { status: 401, body: { error: 'Invalid email or password.' } };
    }

    // Generate JWT token with multi-tenant scope claims
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        vendor_id: user.vendor_id,
        client_id: user.client_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _p, ...safeUser } = user;

    return {
      status: 200,
      body: {
        token,
        user: safeUser
      }
    };
  }

  // ── SIGNUP (Vendor Registration) ──────────────────────────────────────────
  if (method === 'POST' && action === 'signup') {
    const body = await req.json();
    const { companyName, userName, email, password } = body;

    if (!companyName || !userName || !email || !password) {
      return { status: 400, body: { error: 'All fields are required.' } };
    }

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return { status: 400, body: { error: 'Email is already registered.' } };
    }

    try {
      // Create Vendor
      const vendorCode = companyName.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20);
      const vendorRes = await query(
        'INSERT INTO vendors (name, code) VALUES ($1, $2) RETURNING id',
        [companyName, vendorCode]
      );
      const vendorId = vendorRes.rows[0].id;

      // Hash password
      const hashedPassword = bcrypt.hashSync(password.trim(), 10);

      // Create User (VENDOR_ADMIN)
      const userRes = await query(
        `INSERT INTO users (vendor_id, name, email, password, role, status, skills, availability)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, vendor_id, client_id`,
        [vendorId, userName, email.trim(), hashedPassword, 'VENDOR_ADMIN', 'ACTIVE', '', 'FULL_TIME']
      );
      const user = userRes.rows[0];

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          vendor_id: user.vendor_id,
          client_id: user.client_id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return { status: 201, body: { token, user } };
    } catch (err) {
      console.error('Signup Error:', err);
      return { status: 500, body: { error: 'Failed to register. Please try again.' } };
    }
  }

  // ── GET ME ────────────────────────────────────────────────────────────────
  if (method === 'GET' && action === 'me') {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return { status: 401, body: { error: 'No authorization token provided.' } };
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const res = await query('SELECT id, name, email, role, status, skills, availability FROM users WHERE id = $1', [decoded.id]);
      if (res.rows.length === 0) {
        return { status: 404, body: { error: 'User not found.' } };
      }
      return { status: 200, body: { user: res.rows[0] } };
    } catch (err) {
      return { status: 401, body: { error: 'Invalid or expired authentication token.' } };
    }
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
