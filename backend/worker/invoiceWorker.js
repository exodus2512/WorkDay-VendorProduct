import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { query } from '../db/db.js';
import { calculateBillables, validateInvoice, generateInvoicePDF } from '../utils/billing.js';
import { addEmailJob } from './emailQueue.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 1000, 15000);
  }
});

connection.on('error', (err) => {
  console.warn(`[Invoice Worker Redis Warning]: ${err.message}`);
});

export const invoiceWorker = new Worker(
  'invoice-processing',
  async (job) => {
    const { name, data } = job;
    console.log(`[InvoiceWorker] ⚙️ Processing job #${job.id} (${name}) for Project ID: ${data.project_id}`);

    if (name !== 'GENERATE_INVOICE') {
      throw new Error(`Unknown job type: ${name}`);
    }

    const { project_id, timesheet_ids = [], milestone_ids = [], status = 'SENT', user_id } = data;

    if (!project_id) {
      throw new Error('project_id is required');
    }

    // Step 1: Update progress -> 20%
    await job.updateProgress(20);

    // Fetch Project
    const projRes = await query('SELECT * FROM projects WHERE id = $1', [project_id]);
    const project = projRes.rows[0];
    if (!project) {
      throw new Error(`Project with id ${project_id} not found.`);
    }

    // Fetch Assignments
    const assRes = await query('SELECT * FROM assignments WHERE project_id = $1', [project_id]);
    const assignments = assRes.rows;

    // Fetch Milestones (client invoice is milestone-based ONLY)
    const msAll = await query('SELECT * FROM milestones WHERE project_id = $1', [project_id]);
    const projectMilestones = msAll.rows;

    let selectedMilestones = [];
    if (milestone_ids && milestone_ids.length > 0) {
      selectedMilestones = projectMilestones.filter(m => milestone_ids.includes(m.id));
    } else {
      selectedMilestones = projectMilestones.filter(
        m => m.status === 'APPROVED' || m.status === 'COMPLETED'
      );
    }

    // NOTE: Timesheets are an internal vendor→contractor payroll concern.
    //       They are intentionally EXCLUDED from client-facing invoices.
    //       Use the Payrolls module to process contractor pay from timesheets.
    if (selectedMilestones.length === 0) {
      throw new Error('No approved milestones found to invoice for this project.');
    }

    // Fetch Existing Invoices for duplicate validation
    const invAll = await query('SELECT * FROM invoices');
    const itemsAll = await query('SELECT * FROM invoice_items');
    const existingInvoices = invAll.rows.map(inv => ({
      ...inv,
      items: itemsAll.rows.filter(it => it.invoice_id === inv.id)
    }));

    // Step 2: 7-point compliance validation check -> 40%
    await job.updateProgress(40);
    const validation = validateInvoice({
      project,
      assignments,
      timesheets: [],          // Timesheets are NOT part of client invoice validation
      milestones: selectedMilestones,
      existingInvoices
    });

    if (!validation.isValid) {
      const errorMsg = `7-Point Billing Validation Failed: ${validation.exceptions.join('; ')}`;
      console.warn(`[InvoiceWorker] ⚠️ Validation failed for job #${job.id}:`, errorMsg);
      throw new Error(errorMsg);
    }

    // Step 3: Compute Financial Calculations (milestones only) -> 60%
    await job.updateProgress(60);
    const billables = calculateBillables([], selectedMilestones);
    const invoiceNum = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toISOString().split('T')[0];

    // Step 4: Write to DB (invoices & invoice_items) -> 80%
    await job.updateProgress(80);
    const invRes = await query(
      `INSERT INTO invoices (project_id, invoice_number, invoice_date, subtotal, tax, total, status, billing_currency, tax_rate_applied)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        project_id,
        invoiceNum,
        today,
        billables.subtotal,
        billables.tax,
        billables.total,
        status || 'SENT',
        project.billing_currency || 'USD',
        0.18
      ]
    );
    const newInvoice = invRes.rows[0];

    // Save Line Items
    for (const item of billables.items) {
      await query(
        `INSERT INTO invoice_items (invoice_id, type, reference_id, description, quantity, rate, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newInvoice.id, item.type, item.reference_id, item.description, item.quantity, item.rate, item.amount]
      );
    }

    // Step 5: PDF Vector Generation & Notifications -> 100%
    const pdfData = generateInvoicePDF({
      invoice: { ...newInvoice, client_name: project.client_name, project_name: project.name },
      items: billables.items,
      project,
      client: { name: project.client_name },
      vendor: { name: 'VendorCorp Global' }
    });

    // In-App Notification
    const clientUserRes = await query('SELECT id, email, name FROM users WHERE name = $1 AND role = $2', [project.client_name, 'CLIENT']);
    if (clientUserRes.rows.length > 0) {
      const clientUser = clientUserRes.rows[0];
      await query(
        'INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)',
        [
          clientUser.id,
          `New Invoice ${invoiceNum} ($${parseFloat(billables.total).toLocaleString()}) generated for project "${project.name}".`,
          'INVOICE_SUBMITTED'
        ]
      );

      // Email Notification (via BullMQ email-notifications queue)
      if (clientUser.email) {
        await addEmailJob('send-invoice-notification', {
          to: clientUser.email,
          subject: `New Invoice Generated: ${invoiceNum} for Project "${project.name}"`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
              <h2 style="color: #0284c7;">New Invoice Issued</h2>
              <p>Hello ${clientUser.name},</p>
              <p>An official project invoice <strong>${invoiceNum}</strong> has been generated for <strong>${project.name}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Invoice Total:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #16a34a; font-weight: bold;">$${parseFloat(billables.total).toLocaleString()}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Issue Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${today}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Status:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${status || 'SENT'}</td></tr>
              </table>
              <p>You can review line item breakdowns and download the official settlement PDF from your Client Portal.</p>
            </div>
          `
        });
      }
    }

    await job.updateProgress(100);

    console.log(`[InvoiceWorker] ✅ Invoice #${newInvoice.id} (${invoiceNum}) successfully created via background queue!`);

    return {
      success: true,
      invoice_id: newInvoice.id,
      invoice_number: invoiceNum,
      total: billables.total,
      subtotal: billables.subtotal,
      tax: billables.tax,
      status: newInvoice.status,
      filename: pdfData.filename,
      items_count: billables.items.length
    };
  },
  {
    connection,
    concurrency: 2 // Handle 2 simultaneous invoice generation jobs in parallel
  }
);

invoiceWorker.on('completed', (job) => {
  console.log(`✅ [InvoiceWorker] Job #${job.id} finished successfully!`);
});

invoiceWorker.on('failed', (job, err) => {
  console.error(`❌ [InvoiceWorker] Job #${job.id} failed:`, err.message);
});
