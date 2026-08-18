import { query } from '../db/db.js';
import { logAudit } from '../utils/audit.js';
import { isValidTransition } from '../utils/stateMachine.js';

// Helper function: Check if all milestones for a project are completed/approved; if so, update project & assignments to COMPLETED
export async function checkAndUpdateProjectAndAssignmentsCompletion(projectId) {
  if (!projectId) return;
  try {
    const msRes = await query('SELECT status FROM milestones WHERE project_id = $1', [projectId]);
    const milestones = msRes.rows || [];
    if (milestones.length === 0) return;

    // Check if ALL milestones for this project are APPROVED or COMPLETED
    const allCompleted = milestones.every(
      m => String(m.status).toUpperCase() === 'APPROVED' || String(m.status).toUpperCase() === 'COMPLETED'
    );

    if (allCompleted) {
      // Mark project as COMPLETED
      await query("UPDATE projects SET status = 'COMPLETED' WHERE id = $1", [projectId]);
      
      // Mark all contractor assignments for this project as COMPLETED
      await query("UPDATE assignments SET status = 'COMPLETED' WHERE project_id = $1", [projectId]);
    }
  } catch (err) {
    console.error('Error checking project/assignment completion:', err);
  }
}

// Helper function: Calculate contractor payroll according to timesheet hours and rate cards upon milestone approval
async function processMilestoneContractorPayroll(milestone) {
  if (!milestone || !milestone.id || !milestone.project_id) return;

  try {
    // 1. Check if payroll records already exist for this milestone to prevent duplicate payouts
    const checkRes = await query('SELECT id FROM contractor_payrolls WHERE milestone_id = $1', [milestone.id]);
    if (checkRes.rows.length === 0) {
      // Fetch all assignments for this project
      const assignRes = await query('SELECT * FROM assignments WHERE project_id = $1', [milestone.project_id]);
      const assignments = assignRes.rows || [];

      for (const assign of assignments) {
        // Sum approved/submitted timesheet hours for this assignment
        const tsRes = await query(
          "SELECT SUM(total_hours) AS sum_hours FROM timesheets WHERE assignment_id = $1 AND status IN ('APPROVED', 'SUBMITTED')",
          [assign.id]
        );

        const totalHours = parseFloat(tsRes.rows[0]?.sum_hours || 0) || 0;
        
        // RATE VERSIONING: Fetch from assignment_rate_history
        const rateRes = await query(
          `SELECT rate FROM assignment_rate_history 
           WHERE assignment_id = $1 
             AND effective_from <= $2 
             AND (effective_to IS NULL OR effective_to >= $2)
           ORDER BY effective_from DESC LIMIT 1`,
          [assign.id, milestone.due_date || new Date().toISOString().split('T')[0]]
        );
        
        let billingRate = parseFloat(assign.billing_rate || 0) || 0;
        if (rateRes.rows.length > 0) {
          billingRate = parseFloat(rateRes.rows[0].rate);
        }

        const grossPay = totalHours * billingRate;
        const idempotencyKey = `payroll_ms_${milestone.id}_assign_${assign.id}`;

        // Insert contractor payroll record into DB
        // Idempotency: the UNIQUE constraint on idempotency_key prevents duplicates at the DB level
        try {
          await query(
            `INSERT INTO contractor_payrolls (milestone_id, project_id, employee_id, assignment_id, total_hours, billing_rate, gross_pay, status, idempotency_key)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [milestone.id, milestone.project_id, assign.employee_id, assign.id, totalHours, billingRate, grossPay, 'PROCESSED', idempotencyKey]
          );
        } catch (insertErr) {
          // If duplicate key error, we gracefully skip as it means payroll was already cut concurrently
          if (insertErr.message && insertErr.message.includes('unique constraint')) {
             console.log(`Skipping duplicate payroll generation for assignment ${assign.id} (Idempotency Key: ${idempotencyKey})`);
             continue;
          }
          throw insertErr;
        }

        // Notify contractor
        await query(
          `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
          [
            assign.employee_id,
            `Payroll Processed: Milestone "${milestone.name}" approved. Earned $${grossPay.toLocaleString()} (${totalHours} hrs @ $${billingRate}/hr).`,
            'PAYROLL_PROCESSED'
          ]
        );
      }
    }

    // Check and update project & assignment completion status
    await checkAndUpdateProjectAndAssignmentsCompletion(milestone.project_id);
  } catch (err) {
    console.error('Error generating contractor payrolls for milestone:', err);
  }
}

export async function handleMilestones(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/milestones or /api/milestones/:id
  const action = pathSegments[1]; // /api/milestones/:id/approve or reject
  const user = req.user; // Authenticated user from JWT

  if (method === 'GET') {
    const milestoneSelect = `
      SELECT m.*,
        p.name AS project_name, p.client_name,
        p.project_manager_id AS pm_id,
        u.name AS submitted_by_name
      FROM milestones m
      LEFT JOIN projects p ON p.id = m.project_id
      LEFT JOIN users u ON u.id = m.submitted_by
    `;

    if (id && !action) {
      const res = await query(`${milestoneSelect} WHERE m.id = $1`, [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Milestone not found' } };
      return { status: 200, body: res.rows[0] };
    }

    const projId = queryParams.get('project_id');
    const pmId = queryParams.get('pm_id');

    let res;
    if (projId) {
      res = await query(`${milestoneSelect} WHERE m.project_id = $1 ORDER BY m.due_date ASC`, [projId]);
    } else {
      res = await query(`${milestoneSelect} ORDER BY m.due_date ASC`);
    }

    let rows = res.rows;
    if (pmId) {
      rows = rows.filter(m => m.pm_id === parseInt(pmId, 10));
    }

    return { status: 200, body: rows };
  }

  if (method === 'POST') {
    if (id && action === 'approve') {
      const curr = await query('SELECT status FROM milestones WHERE id = $1', [id]);
      if (curr.rows.length === 0) return { status: 404, body: { error: 'Milestone not found' } };

      if (!isValidTransition('MILESTONE', curr.rows[0].status, 'APPROVED')) {
        await logAudit({ vendor_id: user.vendor_id, entity_type: 'MILESTONE', entity_id: parseInt(id), actor_id: user.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: 'APPROVED', metadata: { error: 'Invalid state transition' } });
        return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to APPROVED` } };
      }

      // Concurrency check: must currently be SUBMITTED
      const res = await query(
        "UPDATE milestones SET status = 'APPROVED', rejection_reason = NULL WHERE id = $1 AND status = 'SUBMITTED' RETURNING *",
        [id]
      );
      if (res.rows.length === 0) return { status: 409, body: { error: 'Milestone state changed concurrently. Please refresh.' } };
      const m = res.rows[0];

      // Auto-generate contractor payroll & update assignment completion status if all milestones done
      await processMilestoneContractorPayroll(m);
      await checkAndUpdateProjectAndAssignmentsCompletion(m.project_id);

      if (m.submitted_by) {
        await query(
          "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
          [m.submitted_by, `Milestone "${m.name}" ($${m.amount}) was APPROVED.`, 'MILESTONE_APPROVED']
        );
      }

      // Audit Log
      await logAudit({
        vendor_id: user.vendor_id, entity_type: 'MILESTONE', entity_id: m.id, actor_id: user.id, action: 'APPROVE',
        previous_status: curr.rows[0].status, new_status: 'APPROVED'
      });

      return { status: 200, body: res.rows[0] };
    }

    if (id && action === 'reject') {
      const body = await req.json();
      const { rejection_reason } = body;

      const curr = await query('SELECT status FROM milestones WHERE id = $1', [id]);
      if (curr.rows.length === 0) return { status: 404, body: { error: 'Milestone not found' } };

      if (!isValidTransition('MILESTONE', curr.rows[0].status, 'REJECTED')) {
        await logAudit({ vendor_id: user.vendor_id, entity_type: 'MILESTONE', entity_id: parseInt(id), actor_id: user.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: 'REJECTED', metadata: { error: 'Invalid state transition' } });
        return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to REJECTED` } };
      }

      // Concurrency check
      const res = await query(
        "UPDATE milestones SET status = 'REJECTED', rejection_reason = $1 WHERE id = $2 AND status = 'SUBMITTED' RETURNING *",
        [rejection_reason || 'Revisions required.', id]
      );
      if (res.rows.length === 0) return { status: 409, body: { error: 'Milestone state changed concurrently. Please refresh.' } };
      const m = res.rows[0];

      if (m.submitted_by) {
        await query(
          "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
          [m.submitted_by, `Milestone "${m.name}" was REJECTED: ${rejection_reason || 'Revisions required.'}`, 'MILESTONE_REJECTED']
        );
      }

      // Audit Log
      await logAudit({
        vendor_id: user.vendor_id, entity_type: 'MILESTONE', entity_id: m.id, actor_id: user.id, action: 'REJECT',
        previous_status: curr.rows[0].status, new_status: 'REJECTED', metadata: { rejection_reason }
      });

      return { status: 200, body: res.rows[0] };
    }

    // Create new milestone
    const body = await req.json();
    const { project_id, name, description, amount, due_date, status } = body;

    if (!project_id || !name || !amount || !due_date) {
      return { status: 400, body: { error: 'Missing required milestone fields.' } };
    }

    const res = await query(
      `INSERT INTO milestones (project_id, name, description, amount, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id, name, description || '', amount, due_date, status || 'PENDING']
    );

    return { status: 201, body: res.rows[0] };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { status, submitted_by, evidence, rejection_reason } = body;

    // Submit milestone completion with evidence
    if (body.action === 'SUBMIT') {
      const res = await query(
        `UPDATE milestones SET status = 'SUBMITTED', submitted_by = $1, evidence = $2 WHERE id = $3 RETURNING *`,
        [submitted_by, evidence, id]
      );
      return { status: 200, body: res.rows[0] };
    }

    const res = await query(
      `UPDATE milestones SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *`,
      [status, rejection_reason || null, id]
    );

    if (status === 'APPROVED' && res.rows.length > 0) {
      await processMilestoneContractorPayroll(res.rows[0]);
    }

    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
