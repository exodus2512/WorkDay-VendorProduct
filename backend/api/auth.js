import jwt from 'jsonwebtoken';
import { query } from '../db/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'workday_vendor_product_secret_key_2026';

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

    // Password verification (Default password is 'password123')
    const validPassword = (user.password || 'password123') === password.trim();
    if (!validPassword) {
      return { status: 401, body: { error: 'Invalid email or password.' } };
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
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
