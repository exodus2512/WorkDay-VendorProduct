import { query } from '../db/db.js';
import { calculateBillables, validateInvoice } from '../utils/billing.js';

export async function handleInvoices(req, pathSegments, queryParams) {
  const method = req.method;
  const id = pathSegments[0]; // /api/invoices or /api/invoices/:id or /api/invoices/validate
  const action = pathSegments[1]; // /api/invoices/:id/submit

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

      const tsAll = await query('SELECT * FROM timesheets');
      const timesheets = tsAll.rows.filter(t => timesheet_ids.includes(t.id));

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
      const res = await query("UPDATE invoices SET status = 'SUBMITTED' WHERE id = $1 RETURNING *", [id]);
      if (res.rows.length === 0) return { status: 404, body: { error: 'Invoice not found' } };
      return { status: 200, body: res.rows[0] };
    }

    // Generate & save new invoice
    const body = await req.json();
    const { project_id, timesheet_ids = [], milestone_ids = [] } = body;

    if (!project_id) {
      return { status: 400, body: { error: 'project_id is required to generate invoice.' } };
    }

    // Fetch details
    const tsAll = await query('SELECT * FROM timesheets');
    const selectedTimesheets = tsAll.rows.filter(t => timesheet_ids.includes(t.id));

    const msAll = await query('SELECT * FROM milestones');
    const selectedMilestones = msAll.rows.filter(m => milestone_ids.includes(m.id));

    const billables = calculateBillables(selectedTimesheets, selectedMilestones);
    const invoiceNum = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toISOString().split('T')[0];

    const invRes = await query(
      `INSERT INTO invoices (project_id, invoice_number, invoice_date, subtotal, tax, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [project_id, invoiceNum, today, billables.subtotal, billables.tax, billables.total, 'DRAFT']
    );

    const newInvoice = invRes.rows[0];

    // Save items
    for (const item of billables.items) {
      await query(
        `INSERT INTO invoice_items (invoice_id, type, reference_id, description, quantity, rate, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newInvoice.id, item.type, item.reference_id, item.description, item.quantity, item.rate, item.amount]
      );
    }

    return { status: 201, body: { ...newInvoice, items: billables.items } };
  }

  if (method === 'PUT' && id) {
    const body = await req.json();
    const { status } = body;
    const res = await query('UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    return { status: 200, body: res.rows[0] };
  }

  return { status: 405, body: { error: 'Method Not Allowed' } };
}
