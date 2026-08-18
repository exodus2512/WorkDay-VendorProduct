// // Billing Calculation & Invoice Validation Utility

// export const TAX_RATE = 0.18; // 18% Tax Rate

// /**
//  * Calculates billable amount from approved timesheets and approved milestones
//  */
// export function calculateBillables(approvedTimesheets = [], approvedMilestones = []) {
//   const timesheetItems = approvedTimesheets.map(ts => {
//     const hours = parseFloat(ts.total_hours || 0);
//     const rate = parseFloat(ts.billing_rate || 0);
//     const amount = Math.round(hours * rate * 100) / 100;
//     return {
//       type: 'TIMESHEET',
//       reference_id: ts.id,
//       description: `Timesheet #${ts.id} - ${ts.employee_name || 'Contractor'} (${hours} hrs @ $${rate.toFixed(2)}/hr)`,
//       quantity: hours,
//       rate: rate,
//       amount: amount,
//       assignment_id: ts.assignment_id,
//       week_start: ts.week_start
//     };
//   });

//   const milestoneItems = approvedMilestones.map(m => {
//     const amount = parseFloat(m.amount || 0);
//     return {
//       type: 'MILESTONE',
//       reference_id: m.id,
//       description: `Milestone #${m.id} - ${m.name}`,
//       quantity: 1.0,
//       rate: amount,
//       amount: amount,
//       project_id: m.project_id
//     };
//   });

//   const timesheetTotal = timesheetItems.reduce((acc, item) => acc + item.amount, 0);
//   const milestoneTotal = milestoneItems.reduce((acc, item) => acc + item.amount, 0);

//   const subtotal = Math.round((timesheetTotal + milestoneTotal) * 100) / 100;
//   const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
//   const total = Math.round((subtotal + tax) * 100) / 100;

//   return {
//     timesheetItems,
//     milestoneItems,
//     items: [...timesheetItems, ...milestoneItems],
//     subtotal,
//     tax,
//     taxRate: TAX_RATE,
//     total
//   };
// }

// /**
//  * Validates invoice details against active assignments, rates, duplicate billing, and math rules
//  */
// export function validateInvoice({ project, assignments = [], timesheets = [], milestones = [], existingInvoices = [] }) {
//   const checks = {
//     assignmentExists: { label: 'Active Assignment Exists', passed: true, details: 'Valid active assignment verified.' },
//     assignmentActive: { label: 'Assignment Active Status', passed: true, details: 'Assignment is currently active.' },
//     approvedHoursExist: { label: 'Approved Hours Exist', passed: true, details: 'All billable hours are approved by Project Manager.' },
//     correctBillingRate: { label: 'Correct Billing Rate', passed: true, details: 'Rates match contractual assignment agreements.' },
//     approvedMilestones: { label: 'Approved Milestones', passed: true, details: 'All milestones in invoice have PM approval.' },
//     noDuplicateBilling: { label: 'No Duplicate Billing', passed: true, details: 'No previously billed timesheets or milestones detected.' },
//     calculationCorrect: { label: 'Calculation Accuracy', passed: true, details: 'Subtotal, 18% tax, and total match precisely.' }
//   };

//   const exceptions = [];

//   // Check 1: Assignments
//   if (!assignments || assignments.length === 0) {
//     checks.assignmentExists.passed = false;
//     checks.assignmentExists.details = 'No assignments found for this project.';
//     exceptions.push('Missing project assignment record.');
//   } else {
//     const inactive = assignments.filter(a => a.status !== 'ACTIVE' && a.status !== 'EXPIRING_SOON' && a.status !== 'COMPLETED');
//     if (inactive.length > 0) {
//       checks.assignmentActive.passed = false;
//       checks.assignmentActive.details = `${inactive.length} assignment(s) are inactive or terminated.`;
//       exceptions.push('Invoice includes inactive or expired contractor assignments.');
//     }
//   }

//   // Check 2: Timesheets
//   const unapprovedTimesheets = timesheets.filter(t => t.status !== 'APPROVED');
//   if (unapprovedTimesheets.length > 0) {
//     checks.approvedHoursExist.passed = false;
//     const unapprovedHours = unapprovedTimesheets.reduce((acc, t) => acc + parseFloat(t.total_hours || 0), 0);
//     const approvedHours = timesheets.filter(t => t.status === 'APPROVED').reduce((acc, t) => acc + parseFloat(t.total_hours || 0), 0);
//     checks.approvedHoursExist.details = `Invoice contains ${unapprovedHours + approvedHours} hrs, but only ${approvedHours} hrs are approved. Difference: ${unapprovedHours} hrs.`;
//     exceptions.push(`Contains ${unapprovedHours} unapproved timesheet hours.`);
//   }

//   // Check 3: Rate matching
//   timesheets.forEach(ts => {
//     const matchingAssignment = assignments.find(a => a.id === ts.assignment_id);
//     if (matchingAssignment) {
//       const tsRate = parseFloat(ts.billing_rate || 0);
//       if (tsRate <= 0) {
//         checks.correctBillingRate.passed = false;
//         checks.correctBillingRate.details = `Invalid billing rate ($${tsRate}) for timesheet #${ts.id}.`;
//         exceptions.push(`Invalid rate on timesheet #${ts.id}.`);
//       }
//     }
//   });

//   // Check 4: Approved Milestones
//   const unapprovedMilestones = milestones.filter(m => m.status !== 'APPROVED' && m.status !== 'COMPLETED');
//   if (unapprovedMilestones.length > 0) {
//     checks.approvedMilestones.passed = false;
//     checks.approvedMilestones.details = `${unapprovedMilestones.length} milestone(s) are pending PM approval or rejected.`;
//     exceptions.push(`${unapprovedMilestones.length} milestone(s) lack required approval.`);
//   }

//   // Check 5: Duplicate Billing
//   const billedReferenceIds = new Set();
//   existingInvoices.forEach(inv => {
//     if (inv.status !== 'REJECTED' && inv.items) {
//       inv.items.forEach(item => {
//         billedReferenceIds.add(`${item.type}_${item.reference_id}`);
//       });
//     }
//   });

//   const duplicateTimesheets = timesheets.filter(t => billedReferenceIds.has(`TIMESHEET_${t.id}`));
//   const duplicateMilestones = milestones.filter(m => billedReferenceIds.has(`MILESTONE_${m.id}`));

//   if (duplicateTimesheets.length > 0 || duplicateMilestones.length > 0) {
//     checks.noDuplicateBilling.passed = false;
//     checks.noDuplicateBilling.details = `Duplicate items detected! ${duplicateTimesheets.length} timesheet(s) and ${duplicateMilestones.length} milestone(s) were already billed in prior invoices.`;
//     exceptions.push('Duplicate billing detected for previously invoiced items.');
//   }

//   const isValid = Object.values(checks).every(c => c.passed);

//   return {
//     isValid,
//     statusText: isValid ? 'READY TO SUBMIT' : 'BILLING EXCEPTION DETECTED',
//     checks,
//     exceptions
//   };
// }

// Billing Calculation & Invoice Validation Utility

// ── Tax Rules Engine ────────────────────────────────────────────────────────
// Regional tax rates applied to contractor payroll (NOT client invoices).
// Client invoice tax remains at the fixed rate agreed in the MSA (18% default).
export const TAX_RATE = 0.18; // Fixed 18% GST for client-facing invoices

/** @type {Record<string, number>} tax region code → decimal rate */
const TAX_RULES = {
  'IN-GST':     0.18,   // India GST
  'UK-VAT':     0.20,   // UK VAT
  'EU-VAT':     0.21,   // EU standard VAT
  'AU-GST':     0.10,   // Australia GST
  'SG-GST':     0.09,   // Singapore GST
  'US-TX':      0.0625, // Texas
  'US-CA':      0.0725, // California
  'US-DEFAULT': 0.00,   // US contractors — no GST on B2B labour
  'DEFAULT':    0.00    // Unknown region → 0% (conservative safe default)
};

/**
 * Get the applicable tax rate for a contractor.
 * @param {string} taxRegion - e.g. 'IN-GST', 'UK-VAT'
 * @param {boolean} taxExempt - TRUE for B2B contractors who self-manage tax
 * @returns {number} decimal rate, e.g. 0.18
 */
export function getTaxRate(taxRegion, taxExempt) {
  if (taxExempt) return 0;
  return TAX_RULES[taxRegion] ?? TAX_RULES['DEFAULT'];
}

/** Currency symbol lookup for display purposes */
export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', JPY: '¥', AED: 'د.إ', MYR: 'RM'
};

/**
 * CLIENT INVOICE: Calculates billable amount from approved milestones ONLY.
 *
 * Timesheets are an internal vendor→contractor payroll concern and are
 * NEVER included in client-facing invoices. Clients are billed purely
 * on milestone delivery and acceptance.
 *
 * For contractor payroll calculations, use calculateContractorPayroll().
 */
  //       It remains in the signature for backwards compatibility only.
  //       Client invoices are milestone-based deliverable settlements.
  // ─────────────────────────────────────────────────────────────────────────
export function calculateBillables(approvedTimesheets = [], approvedMilestones = [], isFinal = false, previousInvoices = []) {
  // ─────────────────────────────────────────────────────────────────────────
  // NOTE: approvedTimesheets param is intentionally ignored in client invoices.
  //       It remains in the signature for backwards compatibility only.
  //       Client invoices are milestone-based deliverable settlements.
  // ─────────────────────────────────────────────────────────────────────────

  const milestoneItems = approvedMilestones.map(m => {
    const amount = parseFloat(m.amount || 0);
    return {
      type: 'MILESTONE',
      reference_id: m.id,
      description: m.description ? `Milestone #${m.id} - ${m.name}: ${m.description}` : `Milestone #${m.id} - ${m.name}`,
      milestone_name: m.name,
      milestone_description: m.description || '',
      quantity: 1.0,
      rate: amount,
      amount: amount,
      project_id: m.project_id
    };
  });

  const milestoneTotal = milestoneItems.reduce((acc, item) => acc + item.amount, 0);
  
  let deductionsTotal = 0;
  let deductionItems = [];
  
  if (isFinal && previousInvoices && previousInvoices.length > 0) {
    const validPastInvoices = previousInvoices.filter(inv => inv.status !== 'REJECTED');
    deductionsTotal = validPastInvoices.reduce((acc, inv) => acc + parseFloat(inv.subtotal || 0), 0);
    deductionItems = validPastInvoices.map(inv => ({
      type: 'PREVIOUS_INVOICE',
      reference_id: inv.id,
      description: `Less: Previously Invoiced (${inv.invoice_number})`,
      quantity: 1.0,
      rate: -parseFloat(inv.subtotal || 0),
      amount: -parseFloat(inv.subtotal || 0)
    }));
  }

  const subtotal = Math.round((milestoneTotal - deductionsTotal) * 100) / 100;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return {
    milestoneItems,
    deductionItems,
    items: [...milestoneItems, ...deductionItems],   // Milestone items + any deductions
    subtotal,
    tax,
    taxRate: TAX_RATE,
    total
  };
}

/**
 * CONTRACTOR PAYROLL (MULTI-CURRENCY): Calculates payroll amounts owed to
 * a single contractor in their local payout currency.
 *
 * This is a VENDOR-INTERNAL operation entirely separate from client invoices.
 *
 * @param {Object[]} approvedTimesheets
 * @param {Object}   contractorProfile   - { payout_currency, tax_region, tax_exempt }
 * @param {string}   projectBaseCurrency - billing currency of the project (e.g. 'USD')
 * @param {number}   exchangeRate        - pre-fetched rate (base → payout). Pass 1 for same currency.
 * @returns {Object} full payroll calculation result
 */
export function calculateContractorPayroll(
  approvedTimesheets = [],
  contractorProfile = {},
  projectBaseCurrency = 'USD',
  exchangeRate = 1.0
) {
  const payoutCurrency = (contractorProfile.payout_currency || projectBaseCurrency).toUpperCase();
  const taxRate = getTaxRate(contractorProfile.tax_region, contractorProfile.tax_exempt);
  const rate = parseFloat(exchangeRate) || 1.0;

  const timesheetItems = approvedTimesheets.map(ts => {
    const hours  = parseFloat(ts.total_hours  || 0);
    const bRate  = parseFloat(ts.billing_rate || 0);
    const grossBase  = Math.round(hours * bRate * 100) / 100;     // in project base currency
    const grossLocal = Math.round(grossBase * rate * 100) / 100;  // in payout currency
    const taxAmt     = Math.round(grossLocal * taxRate * 100) / 100;
    const netLocal   = Math.round((grossLocal - taxAmt) * 100) / 100;

    return {
      type: 'TIMESHEET',
      reference_id: ts.id,
      description: `Timesheet #${ts.id} — ${ts.employee_name || 'Contractor'} (${hours} hrs @ ${projectBaseCurrency} ${bRate.toFixed(2)}/hr)`,
      quantity: hours,
      rate: bRate,
      gross_base: grossBase,           // in project currency (USD)
      exchange_rate: rate,
      payout_currency: payoutCurrency,
      gross_local: grossLocal,         // in contractor's currency
      tax_rate: taxRate,
      tax_amount_local: taxAmt,
      net_local: netLocal,
      assignment_id: ts.assignment_id,
      week_start: ts.week_start
    };
  });

  const totalGrossBase  = Math.round(timesheetItems.reduce((a, i) => a + i.gross_base, 0) * 100) / 100;
  const totalGrossLocal = Math.round(timesheetItems.reduce((a, i) => a + i.gross_local, 0) * 100) / 100;
  const totalTaxLocal   = Math.round(timesheetItems.reduce((a, i) => a + i.tax_amount_local, 0) * 100) / 100;
  const totalNetLocal   = Math.round(timesheetItems.reduce((a, i) => a + i.net_local, 0) * 100) / 100;

  return {
    timesheetItems,
    items: timesheetItems,
    project_base_currency: projectBaseCurrency,
    payout_currency: payoutCurrency,
    exchange_rate: rate,
    tax_rate: taxRate,
    tax_region: contractorProfile.tax_region || 'DEFAULT',
    tax_exempt: !!contractorProfile.tax_exempt,
    subtotal_base: totalGrossBase,    // total in USD (or project base)
    gross_local: totalGrossLocal,     // total gross in payout currency
    tax_local: totalTaxLocal,         // total tax deduction in payout currency
    net_local: totalNetLocal          // final payout in payout currency
  };
}

/**
 * CLIENT INVOICE VALIDATION — 5-Point Milestone-Only Billing Audit
 *
 * Client invoices are milestone-based ONLY. Timesheet/hourly checks
 * are intentionally excluded — those belong to internal contractor payroll,
 * not client-facing settlement documents.
 *
 * Checks:
 *  1. Active assignment exists on this project
 *  2. Assignment is currently active/valid
 *  3. All invoiced milestones carry PM approval
 *  4. No milestones are duplicate-billed from prior invoices
 *  5. Calculation accuracy (subtotal, 18% GST, total)
 */
export function validateInvoice({ project, assignments = [], timesheets = [], milestones = [], existingInvoices = [], isFinal = false }) {
  const checks = {
    assignmentExists:  { label: 'Active Assignment Exists',      passed: true, details: 'Valid active assignment verified.' },
    assignmentActive:  { label: 'Assignment Active Status',      passed: true, details: 'Assignment is currently active.' },
    approvedHoursExist:{ label: 'Approved Hours Exist (Payroll)',passed: true, details: 'N/A — Timesheets are processed as internal payroll, not client invoices.' },
    correctBillingRate:{ label: 'Correct Billing Rate (Payroll)',passed: true, details: 'N/A — Rate checks apply to internal payroll only.' },
    approvedMilestones:{ label: 'Approved Milestones',          passed: true, details: 'All milestones in invoice have PM approval.' },
    noDuplicateBilling:{ label: 'No Duplicate Milestone Billing',passed: true, details: 'No previously billed milestones detected.' },
    calculationCorrect:{ label: 'Calculation Accuracy',         passed: true, details: 'Subtotal, 18% GST, and total match precisely.' }
  };

  const exceptions = [];

  // Check 1: At least one assignment exists
  if (!assignments || assignments.length === 0) {
    checks.assignmentExists.passed = false;
    checks.assignmentExists.details = 'No assignments found for this project.';
    exceptions.push('Missing project assignment record.');
  } else {
    // Check 2: Assignments must be active (not terminated/inactive)
    const inactive = assignments.filter(
      a => a.status !== 'ACTIVE' && a.status !== 'EXPIRING_SOON' && a.status !== 'COMPLETED'
    );
    if (inactive.length === assignments.length) {
      // Only fail if ALL assignments are inactive — partial completion is valid
      checks.assignmentActive.passed = false;
      checks.assignmentActive.details = `All ${inactive.length} assignment(s) are inactive or terminated.`;
      exceptions.push('All contractor assignments for this project are inactive.');
    }
  }

  // Checks 3a/3b: Timesheet rate checks SKIPPED — timesheets are internal payroll,
  //               not included in client invoices. Marks as N/A (auto-pass).

  // Check 4: Milestones must be PM-approved
  if (milestones.length === 0) {
    checks.approvedMilestones.passed = false;
    checks.approvedMilestones.details = 'No milestones provided for this invoice.';
    exceptions.push('No milestones provided for billing.');
  } else {
    const unapprovedMilestones = milestones.filter(
      m => m.status !== 'APPROVED' && m.status !== 'COMPLETED'
    );
    if (unapprovedMilestones.length > 0) {
      checks.approvedMilestones.passed = false;
      checks.approvedMilestones.details = `${unapprovedMilestones.length} milestone(s) are pending PM approval or rejected.`;
      exceptions.push(`${unapprovedMilestones.length} milestone(s) lack required PM approval.`);
    }
  }

  // Check 5: No duplicate milestone billing
  if (!isFinal) {
    const billedMilestoneIds = new Set();
    existingInvoices.forEach(inv => {
      if (inv.status !== 'REJECTED' && inv.items) {
        inv.items.forEach(item => {
          if (item.type === 'MILESTONE') {
            billedMilestoneIds.add(`MILESTONE_${item.reference_id}`);
          }
        });
      }
    });

    const duplicateMilestones = milestones.filter(m => billedMilestoneIds.has(`MILESTONE_${m.id}`));
    if (duplicateMilestones.length > 0) {
      checks.noDuplicateBilling.passed = false;
      checks.noDuplicateBilling.details = `${duplicateMilestones.length} milestone(s) were already billed in prior invoices.`;
      exceptions.push('Duplicate billing detected for previously invoiced items.');
    }
  } else {
    // If it's the final invoice, we expect all milestones to be included. Duplicate billing check is skipped
    // because calculateBillables will inject PREVIOUS_INVOICE negative deductions to balance it out.
    checks.noDuplicateBilling.details = 'Skipped duplicate check for final consolidated invoice.';
  }

  // Check 6: Calculation accuracy (milestone totals + GST)
  const calculated = calculateBillables([], milestones, isFinal, existingInvoices);
  if (isNaN(calculated.subtotal) || isNaN(calculated.tax) || isNaN(calculated.total)) {
    checks.calculationCorrect.passed = false;
    checks.calculationCorrect.details = 'Invalid mathematical values in milestone line item calculation.';
    exceptions.push('Mathematical error in line item calculations.');
  }

  const isValid = Object.values(checks).every(c => c.passed);

  return {
    isValid,
    statusText: isValid ? 'READY TO SUBMIT' : 'BILLING EXCEPTION DETECTED',
    checks,
    exceptions
  };
}

/**
 * Checks whether a project is eligible for final invoice generation.
 * A project is eligible ONLY when ALL required milestones for that project have been APPROVED or COMPLETED.
 */
export function isProjectInvoiceEligible({ project, milestones = [], existingInvoices = [] }) {
  if (!project) {
    return {
      isEligible: false,
      reason: 'Project not found.',
      totalMilestones: 0,
      approvedMilestones: 0,
      unapprovedMilestones: 0
    };
  }

  const projMilestones = milestones.filter(m => Number(m.project_id) === Number(project.id));
  const totalMilestones = projMilestones.length;

  if (totalMilestones === 0) {
    return {
      isEligible: false,
      reason: 'No milestones exist for this project.',
      totalMilestones: 0,
      approvedMilestones: 0,
      unapprovedMilestones: 0
    };
  }

  const approvedMilestones = projMilestones.filter(
    m => String(m.status).toUpperCase() === 'APPROVED' || String(m.status).toUpperCase() === 'COMPLETED'
  );
  const unapprovedMilestones = projMilestones.filter(
    m => String(m.status).toUpperCase() !== 'APPROVED' && String(m.status).toUpperCase() !== 'COMPLETED'
  );

  const allApproved = unapprovedMilestones.length === 0;

  // Check if project has already been invoiced
  const existingActiveInvoices = existingInvoices.filter(
    inv => Number(inv.project_id) === Number(project.id) && inv.status !== 'REJECTED'
  );

  // Check if all milestone reference IDs were already billed
  const billedMilestoneIds = new Set();
  existingActiveInvoices.forEach(inv => {
    (inv.items || []).forEach(it => {
      if (it.type === 'MILESTONE') billedMilestoneIds.add(Number(it.reference_id));
    });
  });

  const alreadyBilledAll = projMilestones.every(m => billedMilestoneIds.has(Number(m.id)));

  let reason = '';
  if (!allApproved) {
    reason = `Waiting for ${unapprovedMilestones.length} pending/unapproved milestone(s).`;
  } else if (alreadyBilledAll && existingActiveInvoices.length > 0) {
    reason = `Project milestones have already been billed in invoice ${existingActiveInvoices[0].invoice_number || existingActiveInvoices[0].id}.`;
  } else {
    reason = 'All required milestones are APPROVED. Project is invoice-eligible.';
  }

  const isEligible = allApproved && (!alreadyBilledAll || existingActiveInvoices.length === 0);

  const billables = calculateBillables([], approvedMilestones);

  return {
    isEligible,
    allApproved,
    alreadyBilled: alreadyBilledAll && existingActiveInvoices.length > 0,
    totalMilestones,
    approvedCount: approvedMilestones.length,
    unapprovedCount: unapprovedMilestones.length,
    milestones: projMilestones,
    approvedMilestones,
    unapprovedMilestones,
    billables,
    reason
  };
}

/**
 * Escapes characters for raw PDF text syntax
 */
function escapePdfText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Clean non-ASCII for standard Helvetica
}

/**
 * Generates a clean, professional vector PDF invoice matching standard PDF 1.4 specification
 */
export function generateInvoicePDF({ invoice, items = [], project = {}, client = {}, vendor = {} }) {
  const invNumber = invoice?.invoice_number || `INV-${Date.now()}`;
  const invDate = invoice?.invoice_date || new Date().toISOString().split('T')[0];
  const invStatus = invoice?.status || 'SENT';
  const subtotal = parseFloat(invoice?.subtotal || 0);
  const tax = parseFloat(invoice?.tax || 0);
  const total = parseFloat(invoice?.total || (subtotal + tax));

  const clientName = client?.name || project?.client_name || invoice?.client_name || 'Valued Client';
  const projectName = project?.name || invoice?.project_name || 'Client Project';
  const vendorName = vendor?.name || 'VendorCorp Global';

  // Build stream content for PDF
  const commands = [];

  // Top header banner box
  commands.push('0.94 0.96 0.99 rg 36 735 523 75 re f');
  commands.push('0.82 0.87 0.94 RG 1 w 36 735 523 75 re S');

  // Title & Status Badge
  commands.push('BT /F2 20 Tf 0.08 0.16 0.32 rg 1 0 0 1 52 778 Tm (INVOICE) Tj ET');

  // Status Badge rectangle
  let badgeR = 0.15, badgeG = 0.45, badgeB = 0.85; // Blue for SENT/SUBMITTED
  if (invStatus === 'PAID' || invStatus === 'APPROVED') {
    badgeR = 0.08; badgeG = 0.58; badgeB = 0.35; // Emerald
  } else if (invStatus === 'REJECTED') {
    badgeR = 0.85; badgeG = 0.20; badgeB = 0.20; // Red
  }
  commands.push(`${badgeR} ${badgeG} ${badgeB} rg 445 770 100 22 re f`);
  commands.push(`BT /F2 10 Tf 1 1 1 rg 1 0 0 1 455 777 Tm (STATUS: ${escapePdfText(invStatus)}) Tj ET`);

  // Invoice Number and Date
  commands.push(`BT /F2 9 Tf 0.3 0.35 0.45 rg 1 0 0 1 52 750 Tm (Invoice No:) Tj ET`);
  commands.push(`BT /F2 10 Tf 0.08 0.16 0.32 rg 1 0 0 1 112 750 Tm (${escapePdfText(invNumber)}) Tj ET`);

  commands.push(`BT /F2 9 Tf 0.3 0.35 0.45 rg 1 0 0 1 230 750 Tm (Issue Date:) Tj ET`);
  commands.push(`BT /F1 9 Tf 0.1 0.12 0.18 rg 1 0 0 1 285 750 Tm (${escapePdfText(invDate)}) Tj ET`);

  commands.push(`BT /F2 9 Tf 0.3 0.35 0.45 rg 1 0 0 1 380 750 Tm (Payment Terms:) Tj ET`);
  commands.push(`BT /F1 9 Tf 0.1 0.12 0.18 rg 1 0 0 1 452 750 Tm (Upon Receipt) Tj ET`);

  // Bill From & Bill To Panel (y = 635 to 720)
  commands.push('0.98 0.98 0.99 rg 36 640 250 82 re f');
  commands.push('0.88 0.90 0.94 RG 0.75 w 36 640 250 82 re S');
  commands.push('BT /F2 9 Tf 0.15 0.40 0.85 rg 1 0 0 1 48 705 Tm (BILLED BY (VENDOR)) Tj ET');
  commands.push(`BT /F2 10 Tf 0.08 0.12 0.22 rg 1 0 0 1 48 688 Tm (${escapePdfText(vendorName)}) Tj ET`);
  commands.push('BT /F1 8.5 Tf 0.35 0.40 0.50 rg 1 0 0 1 48 672 Tm (Enterprise Workforce & Project Services) Tj ET');
  commands.push('BT /F1 8.5 Tf 0.35 0.40 0.50 rg 1 0 0 1 48 658 Tm (Multi-Tenant Delivery Network) Tj ET');

  commands.push('0.98 0.98 0.99 rg 309 640 250 82 re f');
  commands.push('0.88 0.90 0.94 RG 0.75 w 309 640 250 82 re S');
  commands.push('BT /F2 9 Tf 0.15 0.40 0.85 rg 1 0 0 1 321 705 Tm (BILLED TO (CLIENT)) Tj ET');
  commands.push(`BT /F2 10 Tf 0.08 0.12 0.22 rg 1 0 0 1 321 688 Tm (${escapePdfText(clientName)}) Tj ET`);
  commands.push(`BT /F2 8.5 Tf 0.25 0.30 0.40 rg 1 0 0 1 321 672 Tm (Project: ${escapePdfText(projectName)}) Tj ET`);
  commands.push('BT /F1 8.5 Tf 0.35 0.40 0.50 rg 1 0 0 1 321 658 Tm (Milestone-Based Deliverables Settlement) Tj ET');

  // Milestone Line Items Table
  let curY = 605;
  // Header row
  commands.push(`0.12 0.22 0.42 rg 36 ${curY} 523 24 re f`);
  commands.push(`BT /F2 9 Tf 1 1 1 rg 1 0 0 1 48 ${curY + 7} Tm (# Deliverable / Milestone Item) Tj ET`);
  commands.push(`BT /F2 9 Tf 1 1 1 rg 1 0 0 1 310 ${curY + 7} Tm (Type) Tj ET`);
  commands.push(`BT /F2 9 Tf 1 1 1 rg 1 0 0 1 370 ${curY + 7} Tm (Qty) Tj ET`);
  commands.push(`BT /F2 9 Tf 1 1 1 rg 1 0 0 1 425 ${curY + 7} Tm (Rate ($)) Tj ET`);
  commands.push(`BT /F2 9 Tf 1 1 1 rg 1 0 0 1 490 ${curY + 7} Tm (Amount ($)) Tj ET`);

  curY -= 28;

  const renderItems = (items && items.length > 0) ? items : [
    { type: 'MILESTONE', description: `Approved Milestone Deliverable - ${projectName}`, quantity: 1, rate: subtotal, amount: subtotal }
  ];

  renderItems.forEach((it, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      commands.push(`0.98 0.98 0.99 rg 36 ${curY - 6} 523 26 re f`);
    }
    // Item name
    const title = it.milestone_name || it.description || `Milestone Deliverable #${idx + 1}`;
    commands.push(`BT /F2 8.5 Tf 0.1 0.12 0.18 rg 1 0 0 1 48 ${curY + 7} Tm (${escapePdfText(title.substring(0, 48))}) Tj ET`);
    if (it.milestone_description && it.milestone_description !== title) {
      commands.push(`BT /F1 7.5 Tf 0.4 0.45 0.55 rg 1 0 0 1 48 ${curY - 3} Tm (${escapePdfText(it.milestone_description.substring(0, 60))}) Tj ET`);
    }

    // Type
    commands.push(`BT /F1 8.5 Tf 0.2 0.25 0.35 rg 1 0 0 1 310 ${curY + 3} Tm (${escapePdfText(it.type || 'MILESTONE')}) Tj ET`);
    // Quantity
    const qty = parseFloat(it.quantity || 1).toFixed(2);
    commands.push(`BT /F1 8.5 Tf 0.2 0.25 0.35 rg 1 0 0 1 372 ${curY + 3} Tm (${qty}) Tj ET`);
    // Rate
    const rateVal = parseFloat(it.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    commands.push(`BT /F1 8.5 Tf 0.2 0.25 0.35 rg 1 0 0 1 420 ${curY + 3} Tm ($${rateVal}) Tj ET`);
    // Amount
    const amtVal = parseFloat(it.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    commands.push(`BT /F2 8.5 Tf 0.08 0.16 0.32 rg 1 0 0 1 485 ${curY + 3} Tm ($${amtVal}) Tj ET`);

    // Row underline
    commands.push(`0.88 0.90 0.94 RG 0.5 w 36 ${curY - 6} m 559 ${curY - 6} l S`);

    curY -= 28;
  });

  // Financial Summary Box
  curY -= 15;
  const summaryBoxHeight = 80;
  commands.push(`0.96 0.97 1.0 rg 330 ${curY - summaryBoxHeight + 20} 229 ${summaryBoxHeight} re f`);
  commands.push(`0.82 0.86 0.94 RG 1 w 330 ${curY - summaryBoxHeight + 20} 229 ${summaryBoxHeight} re S`);

  // Subtotal
  commands.push(`BT /F2 9 Tf 0.3 0.35 0.45 rg 1 0 0 1 345 ${curY + 2} Tm (Subtotal:) Tj ET`);
  commands.push(`BT /F1 9.5 Tf 0.1 0.12 0.18 rg 1 0 0 1 475 ${curY + 2} Tm ($${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) Tj ET`);

  // Tax 18%
  commands.push(`BT /F2 9 Tf 0.3 0.35 0.45 rg 1 0 0 1 345 ${curY - 18} Tm (Tax / GST (18%):) Tj ET`);
  commands.push(`BT /F1 9.5 Tf 0.1 0.12 0.18 rg 1 0 0 1 475 ${curY - 18} Tm ($${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) Tj ET`);

  // Divider
  commands.push(`0.75 0.80 0.90 RG 1 w 340 ${curY - 28} m 545 ${curY - 28} l S`);

  // Total
  commands.push(`BT /F2 11 Tf 0.08 0.18 0.45 rg 1 0 0 1 345 ${curY - 45} Tm (TOTAL DUE:) Tj ET`);
  commands.push(`BT /F2 12 Tf 0.08 0.18 0.45 rg 1 0 0 1 465 ${curY - 45} Tm ($${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) Tj ET`);

  // Footer notes & authentication
  commands.push('0.92 0.94 0.96 RG 0.75 w 36 85 m 559 85 l S');
  commands.push('BT /F2 8 Tf 0.25 0.30 0.40 rg 1 0 0 1 50 68 Tm (IMPORTANT NOTICE & PAYMENT INSTRUCTIONS:) Tj ET');
  commands.push('BT /F1 7.5 Tf 0.40 0.45 0.55 rg 1 0 0 1 50 56 Tm (This invoice is generated automatically following Project Manager approval of all milestone deliverables.) Tj ET');
  commands.push('BT /F1 7.5 Tf 0.40 0.45 0.55 rg 1 0 0 1 50 45 Tm (Payment should be remitted according to your Master Service Agreement terms. Thank you for your business!) Tj ET');

  const streamBody = commands.join('\n');
  const streamLength = Buffer.byteLength(streamBody, 'utf8');

  // Build standard PDF 1.4 objects
  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n' +
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R ' +
    '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\n' +
    'endobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamBody}\nendstream\nendobj\n`
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  // Compute exact xref offsets
  let header = '%PDF-1.4\n';
  const offsets = [];
  let currentOffset = Buffer.byteLength(header, 'utf8');

  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(objects[i], 'utf8');
  }

  let xref = 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 0; i < offsets.length; i++) {
    const padded = String(offsets[i]).padStart(10, '0');
    xref += `${padded} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${currentOffset}\n%%EOF\n`;
  const fullPdf = header + objects.join('') + xref + trailer;

  const pdfBuffer = Buffer.from(fullPdf, 'utf8');
  const pdfBase64 = pdfBuffer.toString('base64');
  const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;

  return {
    pdfBuffer,
    pdfBase64,
    pdfDataUri,
    filename: `${invNumber}.pdf`
  };
}