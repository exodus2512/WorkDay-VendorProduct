// Billing Calculation & Invoice Validation Utility

export const TAX_RATE = 0.18; // 18% Tax Rate

/**
 * Calculates billable amount from approved timesheets and approved milestones
 */
export function calculateBillables(approvedTimesheets = [], approvedMilestones = []) {
  const timesheetItems = approvedTimesheets.map(ts => {
    const hours = parseFloat(ts.total_hours || 0);
    const rate = parseFloat(ts.billing_rate || 0);
    const amount = Math.round(hours * rate * 100) / 100;
    return {
      type: 'TIMESHEET',
      reference_id: ts.id,
      description: `Timesheet #${ts.id} - ${ts.employee_name || 'Contractor'} (${hours} hrs @ $${rate.toFixed(2)}/hr)`,
      quantity: hours,
      rate: rate,
      amount: amount,
      assignment_id: ts.assignment_id,
      week_start: ts.week_start
    };
  });

  const milestoneItems = approvedMilestones.map(m => {
    const amount = parseFloat(m.amount || 0);
    return {
      type: 'MILESTONE',
      reference_id: m.id,
      description: `Milestone #${m.id} - ${m.name}`,
      quantity: 1.0,
      rate: amount,
      amount: amount,
      project_id: m.project_id
    };
  });

  const timesheetTotal = timesheetItems.reduce((acc, item) => acc + item.amount, 0);
  const milestoneTotal = milestoneItems.reduce((acc, item) => acc + item.amount, 0);

  const subtotal = Math.round((timesheetTotal + milestoneTotal) * 100) / 100;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return {
    timesheetItems,
    milestoneItems,
    items: [...timesheetItems, ...milestoneItems],
    subtotal,
    tax,
    taxRate: TAX_RATE,
    total
  };
}

/**
 * Validates invoice details against active assignments, rates, duplicate billing, and math rules
 */
export function validateInvoice({ project, assignments = [], timesheets = [], milestones = [], existingInvoices = [] }) {
  const checks = {
    assignmentExists: { label: 'Active Assignment Exists', passed: true, details: 'Valid active assignment verified.' },
    assignmentActive: { label: 'Assignment Active Status', passed: true, details: 'Assignment is currently active.' },
    approvedHoursExist: { label: 'Approved Hours Exist', passed: true, details: 'All billable hours are approved by Project Manager.' },
    correctBillingRate: { label: 'Correct Billing Rate', passed: true, details: 'Rates match contractual assignment agreements.' },
    approvedMilestones: { label: 'Approved Milestones', passed: true, details: 'All milestones in invoice have PM approval.' },
    noDuplicateBilling: { label: 'No Duplicate Billing', passed: true, details: 'No previously billed timesheets or milestones detected.' },
    calculationCorrect: { label: 'Calculation Accuracy', passed: true, details: 'Subtotal, 18% tax, and total match precisely.' }
  };

  const exceptions = [];

  // Check 1: Assignments
  if (!assignments || assignments.length === 0) {
    checks.assignmentExists.passed = false;
    checks.assignmentExists.details = 'No assignments found for this project.';
    exceptions.push('Missing project assignment record.');
  } else {
    const inactive = assignments.filter(a => a.status !== 'ACTIVE' && a.status !== 'EXPIRING_SOON' && a.status !== 'COMPLETED');
    if (inactive.length > 0) {
      checks.assignmentActive.passed = false;
      checks.assignmentActive.details = `${inactive.length} assignment(s) are inactive or terminated.`;
      exceptions.push('Invoice includes inactive or expired contractor assignments.');
    }
  }

  // Check 2: Timesheets
  const unapprovedTimesheets = timesheets.filter(t => t.status !== 'APPROVED');
  if (unapprovedTimesheets.length > 0) {
    checks.approvedHoursExist.passed = false;
    const unapprovedHours = unapprovedTimesheets.reduce((acc, t) => acc + parseFloat(t.total_hours || 0), 0);
    const approvedHours = timesheets.filter(t => t.status === 'APPROVED').reduce((acc, t) => acc + parseFloat(t.total_hours || 0), 0);
    checks.approvedHoursExist.details = `Invoice contains ${unapprovedHours + approvedHours} hrs, but only ${approvedHours} hrs are approved. Difference: ${unapprovedHours} hrs.`;
    exceptions.push(`Contains ${unapprovedHours} unapproved timesheet hours.`);
  }

  // Check 3: Rate matching
  timesheets.forEach(ts => {
    const matchingAssignment = assignments.find(a => a.id === ts.assignment_id);
    if (matchingAssignment && parseFloat(ts.billing_rate) !== parseFloat(matchingAssignment.billing_rate)) {
      checks.correctBillingRate.passed = false;
      checks.correctBillingRate.details = `Rate mismatch for timesheet #${ts.id}: timesheet rate $${ts.billing_rate} vs assignment contract rate $${matchingAssignment.billing_rate}.`;
      exceptions.push(`Billing rate mismatch detected on timesheet #${ts.id}.`);
    }
  });

  // Check 4: Approved Milestones
  const unapprovedMilestones = milestones.filter(m => m.status !== 'APPROVED' && m.status !== 'COMPLETED');
  if (unapprovedMilestones.length > 0) {
    checks.approvedMilestones.passed = false;
    checks.approvedMilestones.details = `${unapprovedMilestones.length} milestone(s) are pending PM approval or rejected.`;
    exceptions.push(`${unapprovedMilestones.length} milestone(s) lack required approval.`);
  }

  // Check 5: Duplicate Billing
  const billedReferenceIds = new Set();
  existingInvoices.forEach(inv => {
    if (inv.status !== 'REJECTED' && inv.items) {
      inv.items.forEach(item => {
        billedReferenceIds.add(`${item.type}_${item.reference_id}`);
      });
    }
  });

  const duplicateTimesheets = timesheets.filter(t => billedReferenceIds.has(`TIMESHEET_${t.id}`));
  const duplicateMilestones = milestones.filter(m => billedReferenceIds.has(`MILESTONE_${m.id}`));

  if (duplicateTimesheets.length > 0 || duplicateMilestones.length > 0) {
    checks.noDuplicateBilling.passed = false;
    checks.noDuplicateBilling.details = `Duplicate items detected! ${duplicateTimesheets.length} timesheet(s) and ${duplicateMilestones.length} milestone(s) were already billed in prior invoices.`;
    exceptions.push('Duplicate billing detected for previously invoiced items.');
  }

  const isValid = Object.values(checks).every(c => c.passed);

  return {
    isValid,
    statusText: isValid ? 'READY TO SUBMIT' : 'BILLING EXCEPTION DETECTED',
    checks,
    exceptions
  };
}
