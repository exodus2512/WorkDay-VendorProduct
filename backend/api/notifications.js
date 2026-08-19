/**
 * --------------------------------------------------------------------------------
 * IN-APP NOTIFICATIONS API HANDLER (/api/notifications)
 * --------------------------------------------------------------------------------
 * Core Logic & Workflow:
 *  - Serves as the back-end inbox handler for user alert notifications.
 *  - Handles timesheet submissions/approvals/rejections, milestone events, invoice submissions,
 *    payroll disbursements, and timer auto-stop warnings.
 *
 * Supported Operations:
 *  - GET /api/notifications?user_id=123
 *      Retrieves unread and read in-app notifications for a specific user, sorted newest first.
 *  - PUT /api/notifications?user_id=123
 *      Marks all unread notifications as read for the user.
 * --------------------------------------------------------------------------------
 */
import { query } from '../db/db.js';

export async function handleNotifications(req, pathSegments, queryParams) {
  const method = req.method;
  const userId = queryParams.get('user_id');

  if (method === 'GET') {
    let res;
    if (userId) {
      // Filter at the DB level — avoid full table scan
      res = await query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY id DESC',
        [userId]
      );
    } else {
      res = await query('SELECT * FROM notifications ORDER BY id DESC');
    }
    return { status: 200, body: res.rows };
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
