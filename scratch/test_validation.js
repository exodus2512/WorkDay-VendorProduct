import { validateInvoice } from '../backend/utils/billing.js';

const project = { id: 1, name: 'Apex Fintech Modernization', budget: 250000 };
const assignments = [
  { id: 1, project_id: 1, employee_id: 4, billing_rate: 85, status: 'ACTIVE' }
];
const timesheets = [
  { id: 10, assignment_id: 1, employee_id: 4, week_start: '2026-08-16', total_hours: 40, billing_rate: 30, status: 'APPROVED' }
];
const milestones = [
  { id: 11, project_id: 1, name: 'openCv', amount: 200, status: 'APPROVED' },
  { id: 12, project_id: 1, name: 'prototyping', amount: 300, status: 'APPROVED' }
];

const result = validateInvoice({ project, assignments, timesheets, milestones, existingInvoices: [] });
console.log('VALIDATION RESULT:', JSON.stringify(result, null, 2));
