import { query } from '../db/db.js';

export async function handleNotifications(req, pathSegments, queryParams) {
  const method = req.method;
  const userId = queryParams.get('user_id');

  if (method === 'GET') {
    let res = await query('SELECT * FROM notifications ORDER BY id DESC');
    let list = res.rows;
    if (userId) {
      list = list.filter(n => n.user_id === parseInt(userId, 10));
    }
    return { status: 200, body: list };
  }

  if (method === 'PUT') {
    // Mark as read
    if (userId) {
      await query('UPDATE notifications SET read = true WHERE user_id = $1', [userId]);
    }
    return { status: 200, body: { success: true } };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
