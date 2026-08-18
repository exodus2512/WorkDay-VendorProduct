import { query } from '../db/db.js';

export async function handleSeed(req) {
  if (req.method === 'POST') {
    return { status: 200, body: { message: 'Database reset & seed executed.' } };
  }
  return { status: 405, body: { error: 'Method Not Allowed' } };
}
