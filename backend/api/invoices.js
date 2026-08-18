import { query } from '../db/db.js';
import { calculateBillables, validateInvoice } from '../utils/billing.js';
import { logAudit } from '../utils/audit.js';
import { isValidTransition } from '../utils/stateMachine.js';

export async function handleInvoices(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/invoices or /api/invoices/:id or /api/invoices/validate
  const action = pathSegments[1]; // /api/invoices/:id/submit
  const user = req.user; // Authenticated user from JWT

  if (method === 'GET') {
    if (id && id !== 'validate') {
      const res = await query(`
        SELECT i.*, p.name AS project_name, p.client_name
        FROM invoices i
        LEFT JOIN projects p ON p.id = i.project_id
        WHERE i.id = $1
      `, [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Invoice not found' } };
      const invoice = res.rows[0];
      const itemsRes = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
      invoice.items = itemsRes.rows;
      return { status: 200, body: invoice };
    }

    const projId = queryParams.get('project_id');
    let res;
    if (projId) {
      res = await query(`
        SELECT i.*, p.name AS project_name, p.client_name
        FROM invoices i LEFT JOIN projects p ON p.id = i.project_id
        WHERE i.project_id = $1 ORDER BY i.id DESC
      `, [projId]);
    } else {
      res = await query(`
        SELECT i.*, p.name AS project_name, p.client_name
        FROM invoices i LEFT JOIN projects p ON p.id = i.project_id
        ORDER BY i.id DESC
      `);
    }
    // Attach items to each invoice
    const invoices = res.rows;
    for (const inv of invoices) {
      const itemsRes = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
      inv.items = itemsRes.rows;
    }
    return { status: 200, body: invoices };
  }

  if (method === 'POST') {
    // Invoice Validation Endpoint
    if (id === 'validate') {
      const body = await req.json();
      const { project_id, timesheet_ids = [], milestone_ids = [] } = body;

      const projRes = await query('SELECT * FROM projects WHERE id = $1', [project_id]);
      const project = projRes.rows[0] || null;

      const assRes = await query('SELECT * FROM assignments WHERE project_id = $1', [project_id]);
      const assignments = assRes.rows;

      const tsRes = await query(`
      SELECT t.*, a.billing_rate as fallback_rate, 
             COALESCE(
               (SELECT rate FROM assignment_rate_history arh 
                WHERE arh.assignment_id = t.assignment_id 
                  AND arh.effective_from <= t.week_start 
                  AND (arh.effective_to IS NULL OR arh.effective_to >= t.week_start) 
                ORDER BY arh.effective_from DESC LIMIT 1),
               a.billing_rate
             ) as billing_rate,
             u.name as employee_name
      FROM timesheets t
      LEFT JOIN assignments a ON a.id = t.assignment_id
      LEFT JOIN users u ON u.id = t.employee_id
      WHERE t.id = ANY($1) AND a.project_id = $2
      `, [timesheet_ids, project_id]);
      const timesheets = tsRes.rows;

      const msAll = await query('SELECT * FROM milestones');
      const milestones = msAll.rows.filter(m => milestone_ids.includes(m.id));

      const invAll = await query('SELECT * FROM invoices');
      const existingInvoices = invAll.rows;

      const validationResult = validateInvoice({
        project,
        assignments,
        timesheets,
        milestones,
        existingInvoices
      });

      const billables = calculateBillables(timesheets, milestones);

      return {
        status: 200,
        body: {
          validation: validationResult,
          billables
        }
      };
    }

    // Submit invoice
    if (id && action === 'submit') {
      const curr = await query('SELECT status FROM invoices WHERE id = $1', [id]);
      if (curr.rows.length === 0) return { status: 404, body: { error: 'Invoice not found' } };

      if (!isValidTransition('INVOICE', curr.rows[0].status, 'SUBMITTED')) {
        await logAudit({ vendor_id: user.vendor_id, entity_type: 'INVOICE', entity_id: parseInt(id), actor_id: user.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: 'SUBMITTED', metadata: { error: 'Invalid state transition' } });
        return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to SUBMITTED` } };
      }

      // Concurrency check
      const res = await query("UPDATE invoices SET status = 'SUBMITTED' WHERE id = $1 AND status = $2 RETURNING *", [id, curr.rows[0].status]);
      if (res.rows.length === 0) return { status: 409, body: { error: 'Invoice state changed concurrently' } };
      
      await logAudit({
        vendor_id: user.vendor_id, entity_type: 'INVOICE', entity_id: parseInt(id), actor_id: user.id, action: 'SUBMIT',
        previous_status: curr.rows[0].status, new_status: 'SUBMITTED'
      });

      return { status: 200, body: res.rows[0] };
    }

    // Generate & save new invoice
    const body = await req.json();
    const { project_id, timesheet_ids = [], milestone_ids = [] } = body;

    if (!project_id) {
      return { status: 400, body: { error: 'project_id is required to generate invoice.' } };
    }

    // Fetch details
    const tsRes = await query(`
      SELECT t.*, a.billing_rate as fallback_rate, 
             COALESCE(
               (SELECT rate FROM assignment_rate_history arh 
                WHERE arh.assignment_id = t.assignment_id 
                  AND arh.effective_from <= t.week_start 
                  AND (arh.effective_to IS NULL OR arh.effective_to >= t.week_start) 
                ORDER BY arh.effective_from DESC LIMIT 1),
               a.billing_rate
             ) as billing_rate,
             u.name as employee_name
      FROM timesheets t
      LEFT JOIN assignments a ON a.id = t.assignment_id
      LEFT JOIN users u ON u.id = t.employee_id
      WHERE t.id = ANY($1)
    `, [timesheet_ids]);
    const selectedTimesheets = tsRes.rows;

    const msRes = await query('SELECT * FROM milestones WHERE id = ANY($1)', [milestone_ids]);
    const selectedMilestones = msRes.rows;

    const billables = calculateBillables(selectedTimesheets, selectedMilestones);
    const invoiceNum = `INV-2026-${Math.floor(100 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];
    
    // Idempotency: Create a unique key for this generation attempt based on the inputs
    // In a real app we might hash the array of IDs, but joining them works for uniqueness
    const timesheetIdsStr = timesheet_ids.sort().join(',');
    const milestoneIdsStr = milestone_ids.sort().join(',');
    const idempotencyKey = `inv_gen_proj_${project_id}_ts_${timesheetIdsStr}_ms_${milestoneIdsStr}`;

    let newInvoice;
    try {
      const invRes = await query(
        `INSERT INTO invoices (project_id, invoice_number, invoice_date, subtotal, tax, total, status, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [project_id, invoiceNum, today, billables.subtotal, billables.tax, billables.total, 'DRAFT', idempotencyKey]
      );
      newInvoice = invRes.rows[0];
    } catch (insertErr) {
      if (insertErr.message && insertErr.message.includes('unique constraint')) {
        // Idempotency: Duplicate attempt. Fetch the existing invoice and return it
        const existingRes = await query('SELECT * FROM invoices WHERE idempotency_key = $1', [idempotencyKey]);
        if (existingRes.rows.length > 0) {
           const existingInvoice = existingRes.rows[0];
           const itemsRes = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [existingInvoice.id]);
           existingInvoice.items = itemsRes.rows;
           return { status: 200, body: existingInvoice }; // Return 200 OK since it already existed
        }
      }
      throw insertErr;
    }

    // Save items
    for (const item of billables.items) {
      await query(
        `INSERT INTO invoice_items (invoice_id, type, reference_id, description, quantity, rate, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newInvoice.id, item.type, item.reference_id, item.description, item.quantity, item.rate, item.amount]
      );
    }

    // Audit Log
    await logAudit({
      vendor_id: user.vendor_id, entity_type: 'INVOICE', entity_id: newInvoice.id, actor_id: user.id, action: 'GENERATE',
      new_status: 'DRAFT', metadata: { items_count: billables.items.length }
    });

    return { status: 201, body: { ...newInvoice, items: billables.items } };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { status } = body;

    const curr = await query('SELECT status FROM invoices WHERE id = $1', [id]);
    if (curr.rows.length === 0) return { status: 404, body: { error: 'Invoice not found' } };

    if (!isValidTransition('INVOICE', curr.rows[0].status, status)) {
      await logAudit({ vendor_id: user.vendor_id, entity_type: 'INVOICE', entity_id: parseInt(id), actor_id: user.id, action: 'INVALID_TRANSITION_ATTEMPT', previous_status: curr.rows[0].status, new_status: status, metadata: { error: 'Invalid state transition' } });
      return { status: 409, body: { error: `Invalid transition from ${curr.rows[0].status} to ${status}` } };
    }

    const res = await query('UPDATE invoices SET status = $1 WHERE id = $2 AND status = $3 RETURNING *', [status, id, curr.rows[0].status]);
    if (res.rows.length === 0) return { status: 409, body: { error: 'Invoice state changed concurrently' } };
    const updatedInvoice = res.rows[0];

    // Trigger contractor payroll generation upon client invoice payment
    if (status === 'PAID') {
      await processInvoiceContractorPayroll(updatedInvoice);
    }

    await logAudit({
      vendor_id: user.vendor_id, entity_type: 'INVOICE', entity_id: parseInt(id), actor_id: user.id, action: 'UPDATE',
      previous_status: curr.rows[0].status, new_status: status
    });

    return { status: 200, body: updatedInvoice };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}

// Helper function: Generate contractor payroll records once client invoice is marked PAID
async function processInvoiceContractorPayroll(invoice) {
  if (!invoice || !invoice.id) return;
  try {
    const itemsRes = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
    const items = itemsRes.rows || [];

    for (const item of items) {
      if (item.type === 'TIMESHEET') {
        const tsRes = await query('SELECT * FROM timesheets WHERE id = $1', [item.reference_id]);
        if (tsRes.rows.length > 0) {
          const ts = tsRes.rows[0];
          const assignRes = await query('SELECT * FROM assignments WHERE id = $1', [ts.assignment_id]);
          const assign = assignRes.rows[0];
          if (assign) {
            const hours = parseFloat(ts.total_hours || 0);
            const rate = parseFloat(item.rate || assign.billing_rate || 0);
            const grossPay = hours * rate;
            const idempotencyKey = `payroll_inv_${invoice.id}_ts_${ts.id}`;

            try {
              await query(
                `INSERT INTO contractor_payrolls (milestone_id, project_id, employee_id, assignment_id, total_hours, billing_rate, gross_pay, status, idempotency_key)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [null, invoice.project_id, ts.employee_id, assign.id, hours, rate, grossPay, 'PROCESSED', idempotencyKey]
              );

              await query(
                `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
                [
                  ts.employee_id,
                  `Payroll Processed: Invoice ${invoice.invoice_number} paid. Earned $${grossPay.toLocaleString()} (${hours} hrs @ $${rate}/hr).`,
                  'PAYROLL_PROCESSED'
                ]
              );
            } catch (insertErr) {
              if (insertErr.message && insertErr.message.includes('unique constraint')) {
                console.log(`Skipping duplicate payroll generation for timesheet ${ts.id}`);
                continue;
              }
              throw insertErr;
            }
          }
        }
      } else if (item.type === 'MILESTONE') {
        const msRes = await query('SELECT * FROM milestones WHERE id = $1', [item.reference_id]);
        if (msRes.rows.length > 0) {
          const m = msRes.rows[0];
          const assignRes = await query('SELECT * FROM assignments WHERE project_id = $1', [invoice.project_id]);
          const assignments = assignRes.rows || [];

          for (const assign of assignments) {
            const tsRes = await query(
              "SELECT SUM(total_hours) AS sum_hours FROM timesheets WHERE assignment_id = $1 AND status IN ('APPROVED', 'SUBMITTED')",
              [assign.id]
            );
            const totalHours = parseFloat(tsRes.rows[0]?.sum_hours || 0) || 0;
            const rate = parseFloat(assign.billing_rate || 0) || 0;
            const grossPay = totalHours > 0 ? (totalHours * rate) : parseFloat(m.amount || 0);
            const idempotencyKey = `payroll_inv_${invoice.id}_ms_${m.id}_assign_${assign.id}`;

            try {
              await query(
                `INSERT INTO contractor_payrolls (milestone_id, project_id, employee_id, assignment_id, total_hours, billing_rate, gross_pay, status, idempotency_key)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [m.id, invoice.project_id, assign.employee_id, assign.id, totalHours, rate, grossPay, 'PROCESSED', idempotencyKey]
              );

              await query(
                `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
                [
                  assign.employee_id,
                  `Payroll Processed: Client settled Invoice ${invoice.invoice_number} for milestone "${m.name}". Payout: $${grossPay.toLocaleString()}.`,
                  'PAYROLL_PROCESSED'
                ]
              );
            } catch (insertErr) {
              if (insertErr.message && insertErr.message.includes('unique constraint')) {
                console.log(`Skipping duplicate payroll generation for milestone ${m.id}`);
                continue;
              }
              throw insertErr;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error generating contractor payrolls for paid invoice:', err);
  }
}
