/**
 * --------------------------------------------------------------------------------
 * CONTRACTOR PAYROLLS API HANDLER (/api/payrolls)
 * --------------------------------------------------------------------------------
 * Core Logic & Workflow:
 *  - Manages internal vendor-to-contractor payroll disbursements generated upon milestone approval.
 *  - Stores gross pay in project currency, exchange rate used, local payout currency, tax region rates,
 *    and net local pay for each contractor.
 *  - Enforces `isValidTransition('PAYROLL', ...)` state machine rules: `PENDING` -> `PROCESSED` -> `PAID`.
 *  - Evaluates payroll cost against milestone revenue; if total contractor payouts exceed 85% of milestone
 *    value, dispatches an automated budget margin warning email to the `VENDOR_ADMIN`.
 *
 * Supported Operations:
 *  - GET /api/payrolls
 *      Returns all contractor payroll records enriched with employee, project, client, and milestone names.
 *      Supports query filters: `employee_id`, `project_id`, `milestone_id`, `status`.
 *  - GET /api/payrolls/:id
 *      Returns a single payroll record by ID.
 *  - PUT /api/payrolls/:id
 *      Updates payroll disbursement status (`PROCESSED` -> `PAID`).
 * --------------------------------------------------------------------------------
 */
import { query } from '../db/db.js';
import { logAudit } from '../utils/audit.js';
import { isValidTransition } from '../utils/stateMachine.js';
import { sendBudgetWarning } from '../services/notificationService.js';

export async function processPayroll(payrollCost, revenue, adminEmail, projectName) {
  if (!revenue || revenue <= 0) return;
  const marginPercentage = (payrollCost / revenue) * 100;
  if (marginPercentage > 85 && adminEmail) {
    await sendBudgetWarning(adminEmail, projectName || 'Project', marginPercentage.toFixed(2));
  }
}

export async function handlePayrolls(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/payrolls or /api/payrolls/:id
  const user = req.user; // Authenticated user from JWT

  if (method === 'GET') {
    const payrollSelect = `
      SELECT cp.*,
        u.name AS employee_name, u.email AS employee_email,
        p.name AS project_name, p.client_name,
        m.name AS milestone_name
      FROM contractor_payrolls cp
      LEFT JOIN users u ON u.id = cp.employee_id
      LEFT JOIN projects p ON p.id = cp.project_id
      LEFT JOIN milestones m ON m.id = cp.milestone_id
    `;

    if (id) {
      const res = await query(`${payrollSelect} WHERE cp.id = $1`, [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Payroll entry not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const empId = queryParams.get('employee_id');
    const projId = queryParams.get('project_id');

    let res;
    if (empId) {
      res = await query(`${payrollSelect} WHERE cp.employee_id = $1 ORDER BY cp.id DESC`, [empId]);
    } else if (projId) {
      res = await query(`${payrollSelect} WHERE cp.project_id = $1 ORDER BY cp.id DESC`, [projId]);
    } else {
      res = await query(`${payrollSelect} ORDER BY cp.id DESC`);
    }

    return { status: 200, body: res.rows };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { status } = body;

    const curr = await query('SELECT status, project_id, milestone_id, gross_pay FROM contractor_payrolls WHERE id = $1', [id]);
    if (curr.rows.length === 0) return { status: 404, body: { error: 'Payroll entry not found' } };

    if (!isValidTransition('PAYROLL', curr.rows[0].status, status)) {
      await logAudit({ vendor_id: user?.vendor_id, entity_type: 'PAYROLL', entity_id: parseInt(id), actor_id: user?.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: status, metadata: { error: 'Invalid state transition' } });
      return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to ${status}` } };
    }

    const res = await query(
      `UPDATE contractor_payrolls SET status = $1 WHERE id = $2 AND status = $3 RETURNING *`,
      [status, id, curr.rows[0].status]
    );
    if (res.rows.length === 0) return { status: 409, body: { error: 'Payroll state changed concurrently' } };

    // Check budget alert if status changed to PAID or PROCESSED
    if (status === 'PROCESSED' || status === 'PAID') {
      try {
        const milestoneRes = await query('SELECT amount, name FROM milestones WHERE id = $1', [curr.rows[0].milestone_id]);
        const projRes = await query('SELECT name FROM projects WHERE id = $1', [curr.rows[0].project_id]);
        const adminRes = await query("SELECT email FROM users WHERE role = 'VENDOR_ADMIN' LIMIT 1");
        const milestoneAmount = parseFloat(milestoneRes.rows[0]?.amount || 0);

        if (milestoneAmount > 0 && adminRes.rows[0]?.email) {
          const totalCostRes = await query('SELECT SUM(gross_pay) as total_cost FROM contractor_payrolls WHERE milestone_id = $1', [curr.rows[0].milestone_id]);
          const totalCost = parseFloat(totalCostRes.rows[0]?.total_cost || 0);
          await processPayroll(totalCost, milestoneAmount, adminRes.rows[0].email, projRes.rows[0]?.name);
        }
      } catch (alertErr) {
        console.error('Failed to evaluate budget margin on payroll update:', alertErr);
      }
    }

    // Audit Log
    await logAudit({
      vendor_id: user?.vendor_id, entity_type: 'PAYROLL', entity_id: parseInt(id), actor_id: user?.id, action: 'UPDATE',
      previous_status: curr.rows[0].status, new_status: status
    });

    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
