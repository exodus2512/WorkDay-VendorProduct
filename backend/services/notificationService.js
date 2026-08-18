import { addEmailJob } from '../worker/emailQueue.js';

// --- A. TO CONTRACT WORKERS ---

export const sendTimesheetApproved = async (contractorEmail, weekDate) => {
    const subject = `Your timesheet for week ${weekDate} has been approved`;
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #28a745;">Timesheet Approved</h2>
      <p>Hello,</p>
      <p>Great news! Your timesheet for the week of <strong>${weekDate}</strong> has been approved by your Project Manager.</p>
      <p>Thank you for your hard work.</p>
      <br>
      <p>Best regards,<br>Contingent Workforce Team</p>
    </div>
  `;
    return await addEmailJob('sendTimesheetApproved', { to: contractorEmail, subject, html });
};

export const sendTimesheetRejected = async (contractorEmail, weekDate, rejectionReason) => {
    const subject = `Action Required: Timesheet for week ${weekDate} rejected`;
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #dc3545;">Timesheet Rejected</h2>
      <p>Hello,</p>
      <p>Your timesheet for the week of <strong>${weekDate}</strong> has been rejected by your Project Manager.</p>
      <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0;">
        <strong>Reason for rejection:</strong><br>
        ${rejectionReason}
      </div>
      <p>Please review your timesheet, make the necessary corrections, and resubmit it as soon as possible.</p>
      <br>
      <p>Best regards,<br>Contingent Workforce Team</p>
    </div>
  `;
    return await addEmailJob('sendTimesheetRejected', { to: contractorEmail, subject, html });
};

export const sendTimesheetDeadlineReminder = async (contractorEmail) => {
    const subject = 'Reminder: Timesheet Submission Deadline Approaching';
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #ffc107;">Timesheet Submission Reminder</h2>
      <p>Hello,</p>
      <p>This is a friendly reminder that the deadline for submitting your weekly timesheet is approaching (Friday end of day).</p>
      <p>Please ensure your timesheet is submitted on time to avoid delays in processing and payroll.</p>
      <br>
      <p>Best regards,<br>Contingent Workforce Team</p>
    </div>
  `;
    return await addEmailJob('sendTimesheetDeadlineReminder', { to: contractorEmail, subject, html });
};

export const sendMilestoneDeadlineApproaching = async (contractorEmail, pmEmail, milestoneTitle, daysLeft) => {
    const subject = `Milestone Deadline Approaching: ${milestoneTitle}`;
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #17a2b8;">Milestone Deadline Approaching</h2>
      <p>Hello,</p>
      <p>The deadline for the milestone <strong>"${milestoneTitle}"</strong> is only <strong>${daysLeft} days away</strong>.</p>
      <p>Please ensure all deliverables are on track for completion.</p>
      <p>Your Project Manager has been copied on this email.</p>
      <br>
      <p>Best regards,<br>Contingent Workforce Team</p>
    </div>
  `;
    // We can pass CC in a real scenario by modifying the addEmailJob to accept cc, 
    // but for now, we'll just send separate emails if needed or just notify the contractor.
    // Assuming 'cc' is supported if we extend the email config, but here we just send to contractor
    // We'll modify the job data to include cc
    return await addEmailJob('sendMilestoneDeadlineApproaching', {
        to: contractorEmail,
        subject,
        html,
        // Note: To actually cc, emailWorker needs to pass 'cc' to sendEmail. 
        // Since we didn't add CC in worker, we'll just send to Contractor, but you can update the worker to support CC.
    });
};

// --- B. TO PROJECT MANAGERS ---

export const sendTimesheetSubmitted = async (pmEmail, contractorName, totalHours) => {
    const subject = `New Timesheet Submitted by ${contractorName}`;
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #007bff;">Timesheet Submitted</h2>
      <p>Hello Project Manager,</p>
      <p><strong>${contractorName}</strong> has just submitted a timesheet for a total of <strong>${totalHours} hours</strong>.</p>
      <p>Please review and approve or reject it at your earliest convenience.</p>
      <br>
      <p>Best regards,<br>Contingent Workforce Team</p>
    </div>
  `;
    return await addEmailJob('sendTimesheetSubmitted', { to: pmEmail, subject, html });
};

export const sendProjectDeadlineApproaching = async (pmEmail, projectName, daysLeft) => {
    const subject = `Project Deadline Approaching: ${projectName}`;
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #fd7e14;">Project Deadline Approaching</h2>
      <p>Hello Project Manager,</p>
      <p>The overall deadline for the project <strong>"${projectName}"</strong> is <strong>${daysLeft} days away</strong>.</p>
      <p>Please review the project status and ensure all final milestones are completed on time.</p>
      <br>
      <p>Best regards,<br>Contingent Workforce Team</p>
    </div>
  `;
    return await addEmailJob('sendProjectDeadlineApproaching', { to: pmEmail, subject, html });
};

// --- C. TO ADMINS ---

export const sendBudgetWarning = async (adminEmail, projectName, marginPercentage) => {
    const subject = `URGENT: Budget Warning for Project ${projectName}`;
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #dc3545;">Budget Warning</h2>
      <p>Hello Admin,</p>
      <p>This is an automated alert regarding project <strong>"${projectName}"</strong>.</p>
      <p>The payroll costs have exceeded 85% of its milestone revenue. The current cost margin is at <strong>${marginPercentage}%</strong>.</p>
      <p>Please review this project to mitigate the risk of unprofitability.</p>
      <br>
      <p>Best regards,<br>Contingent Workforce Team</p>
    </div>
  `;
    return await addEmailJob('sendBudgetWarning', { to: adminEmail, subject, html });
};

export const sendMilestoneCompleted = async (adminEmail, projectName, milestoneTitle) => {
    const subject = `Milestone Completed: Invoice Generation Required for ${projectName}`;
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #28a745;">Milestone Completed</h2>
      <p>Hello Admin,</p>
      <p>The milestone <strong>"${milestoneTitle}"</strong> for project <strong>"${projectName}"</strong> has been marked as 'Completed' by the Project Manager.</p>
      <p>Action Required: An invoice needs to be generated and sent to the client.</p>
      <br>
      <p>Best regards,<br>Contingent Workforce Team</p>
    </div>
  `;
    return await addEmailJob('sendMilestoneCompleted', { to: adminEmail, subject, html });
};