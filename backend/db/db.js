import { neon } from '@neondatabase/serverless';

// Singleton DB runner supporting Neon Serverless & local memory fallback
let neonSql = null;

function getNeonSql() {
  if (neonSql) return neonSql;
  const connectionString = process.env.DATABASE_URL;
  if (connectionString && !connectionString.includes('placeholder')) {
    try {
      neonSql = neon(connectionString);
      return neonSql;
    } catch (err) {
      console.warn('Failed to initialize Neon serverless connection, falling back to mock DB:', err.message);
    }
  }
  return null;
}

// In-Memory Database Store as resilient fallback when Neon URL is not configured or offline
const memoryDb = {
  users: [
    { id: 1, name: 'Eleanor Vance', email: 'eleanor.vance@vendorcorp.com', password: 'password123', role: 'VENDOR_ADMIN', status: 'ACTIVE', skills: 'Workforce Planning, Vendor Management, Executive Billing', availability: 'FULL_TIME', created_at: '2026-06-01' },
    { id: 2, name: 'Sarah Jenkins', email: 'sarah.j@vendorcorp.com', password: 'password123', role: 'PROJECT_MANAGER', status: 'ACTIVE', skills: 'Agile Delivery, Cloud Architecture, Scrum', availability: 'FULL_TIME', created_at: '2026-06-01' },
    { id: 3, name: 'David Miller', email: 'david.m@vendorcorp.com', password: 'password123', role: 'PROJECT_MANAGER', status: 'ACTIVE', skills: 'ERP Implementation, Financial Tech, Technical Lead', availability: 'FULL_TIME', created_at: '2026-06-01' },
    { id: 4, name: 'Alex Rivera', email: 'alex.rivera@contractor.io', password: 'password123', role: 'EMPLOYEE', status: 'ACTIVE', skills: 'React, Next.js, Tailwind CSS, Node.js', availability: 'FULL_TIME', created_at: '2026-06-01' },
    { id: 5, name: 'Marcus Chen', email: 'marcus.chen@contractor.io', password: 'password123', role: 'EMPLOYEE', status: 'ACTIVE', skills: 'PostgreSQL, Database Tuning, Go, Backend API', availability: 'FULL_TIME', created_at: '2026-06-01' },
    { id: 6, name: 'Elena Rostova', email: 'elena.rostova@contractor.io', password: 'password123', role: 'EMPLOYEE', status: 'ACTIVE', skills: 'UI/UX Design, Figma, Design Systems, Frontend', availability: 'PART_TIME', created_at: '2026-06-01' },
    { id: 7, name: 'Devon Smith', email: 'devon.smith@contractor.io', password: 'password123', role: 'EMPLOYEE', status: 'ACTIVE', skills: 'DevOps, Kubernetes, AWS, Terraform', availability: 'FULL_TIME', created_at: '2026-06-01' },
    { id: 8, name: 'Priya Patel', email: 'priya.patel@contractor.io', password: 'password123', role: 'EMPLOYEE', status: 'ACTIVE', skills: 'QA Automation, Cypress, Jest, Integration Testing', availability: 'FULL_TIME', created_at: '2026-06-01' },
    { id: 9, name: 'Jordan Lee', email: 'jordan.lee@contractor.io', password: 'password123', role: 'EMPLOYEE', status: 'ACTIVE', skills: 'Python, Data Analytics, ETL, Snowflake', availability: 'FULL_TIME', created_at: '2026-06-01' },
    { id: 10, name: 'Sam Taylor', email: 'sam.taylor@contractor.io', password: 'password123', role: 'EMPLOYEE', status: 'UNAVAILABLE', skills: 'iOS, Swift, Mobile Security', availability: 'UNAVAILABLE', created_at: '2026-06-01' },
    { id: 11, name: 'Taylor Reed', email: 'taylor.reed@contractor.io', password: 'password123', role: 'EMPLOYEE', status: 'ACTIVE', skills: 'Fullstack JavaScript, GraphQL, Micro-frontends', availability: 'FULL_TIME', created_at: '2026-06-01' }
  ],
  projects: [
    { id: 1, name: 'Apex Fintech Modernization', client_name: 'Apex Financial Services', description: 'Full overhaul of core trading portal and client dashboard with modern web stack.', budget: 250000.00, start_date: '2026-06-01', end_date: '2026-12-31', status: 'ACTIVE', project_manager_id: 2, created_at: '2026-06-01' },
    { id: 2, name: 'Cloud Migration & Data Pipeline', client_name: 'Logistics Global Inc.', description: 'Migrating legacy ERP workloads to AWS cloud with automated Snowflake ETL pipelines.', budget: 180000.00, start_date: '2026-07-15', end_date: '2026-11-30', status: 'ACTIVE', project_manager_id: 3, created_at: '2026-07-15' },
    { id: 3, name: 'Healthcare AI Analytics Portal', client_name: 'BioCare Health Network', description: 'HIPAA compliant portal for patient telemetry and automated diagnostic reporting.', budget: 140000.00, start_date: '2026-08-01', end_date: '2026-10-31', status: 'PENDING', project_manager_id: 2, created_at: '2026-08-01' }
  ],
  assignments: [
    { id: 1, project_id: 1, employee_id: 4, role: 'Senior Frontend Engineer', start_date: '2026-06-01', end_date: '2026-12-31', billing_rate: 85.00, weekly_hour_limit: 40, status: 'ACTIVE', created_at: '2026-06-01' },
    { id: 2, project_id: 1, employee_id: 5, role: 'Lead Database Architect', start_date: '2026-06-01', end_date: '2026-12-31', billing_rate: 95.00, weekly_hour_limit: 40, status: 'ACTIVE', created_at: '2026-06-01' },
    { id: 3, project_id: 1, employee_id: 6, role: 'Principal UI/UX Designer', start_date: '2026-06-15', end_date: '2026-09-30', billing_rate: 75.00, weekly_hour_limit: 20, status: 'ACTIVE', created_at: '2026-06-15' },
    { id: 4, project_id: 2, employee_id: 7, role: 'DevOps Specialist', start_date: '2026-07-15', end_date: '2026-11-30', billing_rate: 90.00, weekly_hour_limit: 40, status: 'ACTIVE', created_at: '2026-07-15' },
    { id: 5, project_id: 2, employee_id: 9, role: 'Data Analytics Engineer', start_date: '2026-07-15', end_date: '2026-11-30', billing_rate: 80.00, weekly_hour_limit: 40, status: 'ACTIVE', created_at: '2026-07-15' },
    { id: 6, project_id: 1, employee_id: 8, role: 'QA Automation Lead', start_date: '2026-07-01', end_date: '2026-08-25', billing_rate: 70.00, weekly_hour_limit: 40, status: 'EXPIRING_SOON', created_at: '2026-07-01' },
    { id: 7, project_id: 2, employee_id: 11, role: 'Fullstack Integrator', start_date: '2026-08-01', end_date: '2026-11-30', billing_rate: 85.00, weekly_hour_limit: 40, status: 'ACTIVE', created_at: '2026-08-01' },
    { id: 8, project_id: 3, employee_id: 4, role: 'Mobile Web Consultant', start_date: '2026-08-15', end_date: '2026-10-31', billing_rate: 95.00, weekly_hour_limit: 20, status: 'ACTIVE', created_at: '2026-08-15' }
  ],
  milestones: [
    { id: 1, project_id: 1, name: 'M1: Architecture Blueprint & UX Wireframes', description: 'Complete technical architecture document and sign-off on high-fidelity designs.', amount: 25000.00, due_date: '2026-06-30', status: 'COMPLETED', submitted_by: 4, evidence: 'https://docs.vendorcorp.com/apex-arch-v1.pdf', rejection_reason: null, created_at: '2026-06-01' },
    { id: 2, project_id: 1, name: 'M2: Authentication & Core Dashboard UI', description: 'Deliver OAuth2 integration, role control, and main reactive dashboard screens.', amount: 45000.00, due_date: '2026-08-15', status: 'SUBMITTED', submitted_by: 4, evidence: 'https://github.com/vendorcorp/apex-portal/pull/42 - All automated E2E tests passing.', rejection_reason: null, created_at: '2026-06-15' },
    { id: 3, project_id: 1, name: 'M3: Payment Engine & Order Placement', description: 'Real-time WebSocket market ticker feed and trade execution workflow.', amount: 50000.00, due_date: '2026-10-15', status: 'IN_PROGRESS', submitted_by: null, evidence: null, rejection_reason: null, created_at: '2026-07-01' },
    { id: 4, project_id: 2, name: 'M1: Cloud Infrastructure Provisioning', description: 'Terraform scripts for VPC, EKS cluster, IAM security policies, and RDS Postgres.', amount: 35000.00, due_date: '2026-08-10', status: 'APPROVED', submitted_by: 7, evidence: 'https://aws.console.vendorcorp.com/terraform-run-log-882.txt', rejection_reason: null, created_at: '2026-07-15' },
    { id: 5, project_id: 2, name: 'M2: Snowflake Data Pipeline Ingestion', description: 'ETL pipeline for daily ingestion of 10M records with error fallback alerting.', amount: 40000.00, due_date: '2026-09-30', status: 'PENDING', submitted_by: null, evidence: null, rejection_reason: null, created_at: '2026-07-15' },
    { id: 6, project_id: 3, name: 'M1: HIPAA Compliance & Security Audit', description: 'Third-party audit verification for encrypted data storage and patient privacy.', amount: 20000.00, due_date: '2026-08-20', status: 'PENDING', submitted_by: null, evidence: null, rejection_reason: null, created_at: '2026-08-01' }
  ],
  timesheets: [
    { id: 1, assignment_id: 1, employee_id: 4, week_start: '2026-08-03', total_hours: 40.00, work_description: 'Developed reactive dashboard components, integrated chart widgets, fixed CSS layout edge cases.', status: 'APPROVED', rejection_reason: null, created_at: '2026-08-07' },
    { id: 2, assignment_id: 2, employee_id: 5, week_start: '2026-08-03', total_hours: 40.00, work_description: 'Optimized query execution plans, set up read-replica indexing, tuned Postgres connection pool.', status: 'APPROVED', rejection_reason: null, created_at: '2026-08-07' },
    { id: 3, assignment_id: 1, employee_id: 4, week_start: '2026-08-10', total_hours: 40.00, work_description: 'Implemented timesheet validation modal, header role selector, and interactive dashboard tables.', status: 'SUBMITTED', rejection_reason: null, created_at: '2026-08-14' },
    { id: 4, assignment_id: 2, employee_id: 5, week_start: '2026-08-10', total_hours: 38.50, work_description: 'Configured database schema migrations and automated Neon database seed runner.', status: 'SUBMITTED', rejection_reason: null, created_at: '2026-08-14' },
    { id: 5, assignment_id: 3, employee_id: 6, week_start: '2026-08-03', total_hours: 20.00, work_description: 'Designed UI components, dark mode color palette, and micro-animations for invoice flow.', status: 'APPROVED', rejection_reason: null, created_at: '2026-08-07' },
    { id: 6, assignment_id: 4, employee_id: 7, week_start: '2026-08-10', total_hours: 42.00, work_description: 'Provisioned production Kubernetes cluster and resolved ingress controller DNS routing issue.', status: 'REJECTED', rejection_reason: 'Hours exceed 40-hour weekly limit without prior overtime pre-authorization. Please update to 40 hours.', created_at: '2026-08-14' },
    { id: 7, assignment_id: 5, employee_id: 9, week_start: '2026-08-10', total_hours: 35.00, work_description: 'Built SQL transformation scripts for data ingestion pipeline and validated test benchmarks.', status: 'DRAFT', rejection_reason: null, created_at: '2026-08-14' }
  ],
  timesheet_entries: [
    { id: 1, timesheet_id: 1, date: '2026-08-03', hours: 8.00, description: 'Header and Sidebar responsive design' },
    { id: 2, timesheet_id: 1, date: '2026-08-04', hours: 8.00, description: 'Dashboard metric cards component' },
    { id: 3, timesheet_id: 1, date: '2026-08-05', hours: 8.00, description: 'Role switching state context' },
    { id: 4, timesheet_id: 1, date: '2026-08-06', hours: 8.00, description: 'Invoice generation form state' },
    { id: 5, timesheet_id: 1, date: '2026-08-07', hours: 8.00, description: 'Testing and bug fixes for release' },
    { id: 6, timesheet_id: 2, date: '2026-08-03', hours: 8.00, description: 'DB schema optimization' },
    { id: 7, timesheet_id: 2, date: '2026-08-04', hours: 8.00, description: 'Neon serverless pool testing' },
    { id: 8, timesheet_id: 2, date: '2026-08-05', hours: 8.00, description: 'Index creation for lookups' },
    { id: 9, timesheet_id: 2, date: '2026-08-06', hours: 8.00, description: 'Query benchmarks' },
    { id: 10, timesheet_id: 2, date: '2026-08-07', hours: 8.00, description: 'Documentation' },
    { id: 11, timesheet_id: 3, date: '2026-08-10', hours: 8.00, description: 'Timesheet submission UI' },
    { id: 12, timesheet_id: 3, date: '2026-08-11', hours: 8.00, description: 'Milestone approval workflow' },
    { id: 13, timesheet_id: 3, date: '2026-08-12', hours: 8.00, description: 'Vendor Admin billing dashboard' },
    { id: 14, timesheet_id: 3, date: '2026-08-13', hours: 8.00, description: 'Invoice validation check logic' },
    { id: 15, timesheet_id: 3, date: '2026-08-14', hours: 8.00, description: 'End to end testing' }
  ],
  invoices: [
    { id: 1, project_id: 1, invoice_number: 'INV-2026-001', invoice_date: '2026-08-07', subtotal: 31800.00, tax: 5724.00, total: 37524.00, status: 'APPROVED', created_at: '2026-08-07' },
    { id: 2, project_id: 2, invoice_number: 'INV-2026-002', invoice_date: '2026-08-12', subtotal: 35000.00, tax: 6300.00, total: 41300.00, status: 'SUBMITTED', created_at: '2026-08-12' }
  ],
  invoice_items: [
    { id: 1, invoice_id: 1, type: 'TIMESHEET', reference_id: 1, description: 'Timesheet #1 - Alex Rivera (40 hrs @ $85.00/hr)', quantity: 40.00, rate: 85.00, amount: 3400.00 },
    { id: 2, invoice_id: 1, type: 'TIMESHEET', reference_id: 2, description: 'Timesheet #2 - Marcus Chen (40 hrs @ $95.00/hr)', quantity: 40.00, rate: 95.00, amount: 3800.00 },
    { id: 3, invoice_id: 1, type: 'TIMESHEET', reference_id: 5, description: 'Timesheet #5 - Elena Rostova (20 hrs @ $75.00/hr)', quantity: 20.00, rate: 75.00, amount: 1500.00 },
    { id: 4, invoice_id: 1, type: 'MILESTONE', reference_id: 1, description: 'Milestone #1 - M1: Architecture Blueprint & UX Wireframes', quantity: 1.00, rate: 23100.00, amount: 23100.00 },
    { id: 5, invoice_id: 2, type: 'MILESTONE', reference_id: 4, description: 'Milestone #4 - M1: Cloud Infrastructure Provisioning', quantity: 1.00, rate: 35000.00, amount: 35000.00 }
  ],
  notifications: [
    { id: 1, user_id: 4, message: 'Your timesheet for week starting 2026-08-03 (40 hrs) was APPROVED by Sarah Jenkins.', type: 'TIMESHEET_APPROVED', read: true, created_at: '2026-08-07' },
    { id: 2, user_id: 5, message: 'Your timesheet for week starting 2026-08-03 (40 hrs) was APPROVED by Sarah Jenkins.', type: 'TIMESHEET_APPROVED', read: true, created_at: '2026-08-07' },
    { id: 3, user_id: 7, message: 'Your timesheet for week 2026-08-10 was REJECTED: Hours exceed 40-hour limit.', type: 'TIMESHEET_REJECTED', read: false, created_at: '2026-08-14' },
    { id: 4, user_id: 2, message: 'Milestone M2 submitted by Alex Rivera requires your review.', type: 'MILESTONE_SUBMITTED', read: false, created_at: '2026-08-14' },
    { id: 5, user_id: 1, message: 'Invoice INV-2026-002 was submitted for client Logistics Global Inc.', type: 'INVOICE_SUBMITTED', read: false, created_at: '2026-08-12' }
  ]
};

// Database Query Wrapper
export async function query(queryString, params = []) {
  const sql = getNeonSql();
  if (sql) {
    try {
      // Execute query using Neon serverless sql client
      const results = await sql(queryString, params);

      // Neon HTTP driver can return:
      //   1. A plain array of row objects: [{...}, {...}]  → for SELECT
      //   2. An object with a .rows property: { rows: [...], rowCount: N } → for INSERT/UPDATE with RETURNING
      // Normalize both shapes into { rows: [] } for consistency.
      if (Array.isArray(results)) {
        return { rows: results };
      } else if (results && Array.isArray(results.rows)) {
        return { rows: results.rows };
      } else {
        return { rows: [] };
      }
    } catch (err) {
      console.error('Neon query error, falling back to memory database store:', err.message);
    }
  }
  return executeInMemoryQuery(queryString, params);
}

// Fallback in-memory database handler for instantaneous offline reliability
function executeInMemoryQuery(queryString, params) {
  const q = queryString.trim().toLowerCase();
  
  // Table resets / initializations
  if (q.startsWith('drop table') || q.startsWith('create table') || q.startsWith('select setval')) {
    return { rows: [] };
  }

  // Users Queries
  if (q.includes('from users')) {
    let list = [...memoryDb.users];
    if (q.includes('where lower(email) =') || q.includes('where email =')) {
      const emailTarget = (params[0] || '').toLowerCase().trim();
      list = list.filter(u => u.email.toLowerCase().trim() === emailTarget);
    } else if (q.includes('where role =') || q.includes('role=')) {
      const match = params[0] || (q.includes('vendor_admin') ? 'VENDOR_ADMIN' : q.includes('project_manager') ? 'PROJECT_MANAGER' : 'EMPLOYEE');
      list = list.filter(u => u.role === match || u.role === params[0]);
    } else if (q.includes('where id =')) {
      const id = parseInt(params[0], 10);
      list = list.filter(u => u.id === id);
    }
    return { rows: list };
  }

  // Insert User
  if (q.startsWith('insert into users')) {
    const id = memoryDb.users.length + 1;
    const newUser = {
      id,
      name: params[0],
      email: params[1],
      role: params[2],
      status: params[3] || 'ACTIVE',
      skills: params[4] || '',
      availability: params[5] || 'FULL_TIME',
      created_at: new Date().toISOString()
    };
    memoryDb.users.push(newUser);
    return { rows: [newUser] };
  }

  // Update User
  if (q.startsWith('update users')) {
    const id = parseInt(params[params.length - 1], 10);
    const uIndex = memoryDb.users.findIndex(u => u.id === id);
    if (uIndex !== -1) {
      if (params.length >= 5) {
        memoryDb.users[uIndex].name = params[0];
        memoryDb.users[uIndex].email = params[1];
        memoryDb.users[uIndex].skills = params[2];
        memoryDb.users[uIndex].availability = params[3];
        memoryDb.users[uIndex].status = params[4];
      } else if (params.length === 2) {
        memoryDb.users[uIndex].status = params[0];
      }
      return { rows: [memoryDb.users[uIndex]] };
    }
    return { rows: [] };
  }

  // Projects Queries
  if (q.includes('from projects')) {
    let list = memoryDb.projects.map(p => {
      const pm = memoryDb.users.find(u => u.id === p.project_manager_id);
      return { ...p, pm_name: pm ? pm.name : 'Unassigned' };
    });
    if (q.includes('where project_manager_id =')) {
      const pmId = parseInt(params[0], 10);
      list = list.filter(p => p.project_manager_id === pmId);
    }
    if (q.includes('where id =')) {
      const id = parseInt(params[0], 10);
      list = list.filter(p => p.id === id);
    }
    return { rows: list };
  }

  // Insert Project
  if (q.startsWith('insert into projects')) {
    const id = memoryDb.projects.length + 1;
    const newProject = {
      id,
      name: params[0],
      client_name: params[1],
      description: params[2],
      budget: parseFloat(params[3]),
      start_date: params[4],
      end_date: params[5],
      status: params[6] || 'PENDING',
      project_manager_id: params[7] ? parseInt(params[7], 10) : null,
      created_at: new Date().toISOString()
    };
    memoryDb.projects.push(newProject);
    return { rows: [newProject] };
  }

  // Update Project
  if (q.startsWith('update projects')) {
    const id = parseInt(params[params.length - 1], 10);
    const pIndex = memoryDb.projects.findIndex(p => p.id === id);
    if (pIndex !== -1) {
      if (q.includes('status =') && params.length === 2) {
        memoryDb.projects[pIndex].status = params[0];
      } else if (q.includes('project_manager_id =') && params.length === 2) {
        memoryDb.projects[pIndex].project_manager_id = parseInt(params[0], 10);
      } else if (params.length >= 6) {
        memoryDb.projects[pIndex].name = params[0];
        memoryDb.projects[pIndex].client_name = params[1];
        memoryDb.projects[pIndex].description = params[2];
        memoryDb.projects[pIndex].budget = parseFloat(params[3]);
        memoryDb.projects[pIndex].start_date = params[4];
        memoryDb.projects[pIndex].end_date = params[5];
        if (params[6]) memoryDb.projects[pIndex].status = params[6];
        if (params[7]) memoryDb.projects[pIndex].project_manager_id = parseInt(params[7], 10);
      }
      return { rows: [memoryDb.projects[pIndex]] };
    }
    return { rows: [] };
  }

  // Assignments Queries
  if (q.includes('from assignments')) {
    let list = memoryDb.assignments.map(a => {
      const pr = memoryDb.projects.find(p => p.id === a.project_id);
      const emp = memoryDb.users.find(u => u.id === a.employee_id);
      const pm = pr ? memoryDb.users.find(u => u.id === pr.project_manager_id) : null;
      return {
        ...a,
        project_name: pr ? pr.name : 'Unknown Project',
        client_name: pr ? pr.client_name : '',
        employee_name: emp ? emp.name : 'Unknown Employee',
        employee_email: emp ? emp.email : '',
        pm_name: pm ? pm.name : 'Unassigned',
        pm_id: pr ? pr.project_manager_id : null
      };
    });
    if (q.includes('where employee_id =')) {
      const empId = parseInt(params[0], 10);
      list = list.filter(a => a.employee_id === empId);
    }
    if (q.includes('where project_id =')) {
      const projId = parseInt(params[0], 10);
      list = list.filter(a => a.project_id === projId);
    }
    if (q.includes('where id =')) {
      const id = parseInt(params[0], 10);
      list = list.filter(a => a.id === id);
    }
    return { rows: list };
  }

  // Insert Assignment
  if (q.startsWith('insert into assignments')) {
    const id = memoryDb.assignments.length + 1;
    const newAss = {
      id,
      project_id: parseInt(params[0], 10),
      employee_id: parseInt(params[1], 10),
      role: params[2],
      start_date: params[3],
      end_date: params[4],
      billing_rate: parseFloat(params[5]),
      weekly_hour_limit: parseInt(params[6], 10) || 40,
      status: params[7] || 'ACTIVE',
      created_at: new Date().toISOString()
    };
    memoryDb.assignments.push(newAss);
    return { rows: [newAss] };
  }

  // Update Assignment
  if (q.startsWith('update assignments')) {
    const id = parseInt(params[params.length - 1], 10);
    const aIndex = memoryDb.assignments.findIndex(a => a.id === id);
    if (aIndex !== -1) {
      if (params.length === 2 && q.includes('status =')) {
        memoryDb.assignments[aIndex].status = params[0];
      } else if (params.length >= 6) {
        memoryDb.assignments[aIndex].role = params[0];
        memoryDb.assignments[aIndex].start_date = params[1];
        memoryDb.assignments[aIndex].end_date = params[2];
        memoryDb.assignments[aIndex].billing_rate = parseFloat(params[3]);
        memoryDb.assignments[aIndex].weekly_hour_limit = parseInt(params[4], 10);
        memoryDb.assignments[aIndex].status = params[5];
      }
      return { rows: [memoryDb.assignments[aIndex]] };
    }
    return { rows: [] };
  }

  // Milestones Queries
  if (q.includes('from milestones')) {
    let list = memoryDb.milestones.map(m => {
      const pr = memoryDb.projects.find(p => p.id === m.project_id);
      const sub = m.submitted_by ? memoryDb.users.find(u => u.id === m.submitted_by) : null;
      return {
        ...m,
        project_name: pr ? pr.name : '',
        client_name: pr ? pr.client_name : '',
        submitted_by_name: sub ? sub.name : null,
        pm_id: pr ? pr.project_manager_id : null
      };
    });
    if (q.includes('where project_id =')) {
      const projId = parseInt(params[0], 10);
      list = list.filter(m => m.project_id === projId);
    }
    if (q.includes('where id =')) {
      const id = parseInt(params[0], 10);
      list = list.filter(m => m.id === id);
    }
    return { rows: list };
  }

  // Insert Milestone
  if (q.startsWith('insert into milestones')) {
    const id = memoryDb.milestones.length + 1;
    const newM = {
      id,
      project_id: parseInt(params[0], 10),
      name: params[1],
      description: params[2],
      amount: parseFloat(params[3]),
      due_date: params[4],
      status: params[5] || 'PENDING',
      submitted_by: params[6] ? parseInt(params[6], 10) : null,
      evidence: params[7] || null,
      rejection_reason: null,
      created_at: new Date().toISOString()
    };
    memoryDb.milestones.push(newM);
    return { rows: [newM] };
  }

  // Update Milestone
  if (q.startsWith('update milestones')) {
    const id = parseInt(params[params.length - 1], 10);
    const mIndex = memoryDb.milestones.findIndex(m => m.id === id);
    if (mIndex !== -1) {
      if (q.includes('status =') && q.includes('evidence =')) {
        memoryDb.milestones[mIndex].status = params[0];
        memoryDb.milestones[mIndex].submitted_by = parseInt(params[1], 10);
        memoryDb.milestones[mIndex].evidence = params[2];
      } else if (q.includes('status =') && q.includes('rejection_reason =')) {
        memoryDb.milestones[mIndex].status = params[0];
        memoryDb.milestones[mIndex].rejection_reason = params[1];
      } else if (q.includes('status =')) {
        memoryDb.milestones[mIndex].status = params[0];
      }
      return { rows: [memoryDb.milestones[mIndex]] };
    }
    return { rows: [] };
  }

  // Timesheets Queries
  if (q.includes('from timesheets')) {
    let list = memoryDb.timesheets.map(t => {
      const ass = memoryDb.assignments.find(a => a.id === t.assignment_id);
      const pr = ass ? memoryDb.projects.find(p => p.id === ass.project_id) : null;
      const emp = memoryDb.users.find(u => u.id === t.employee_id);
      const entries = memoryDb.timesheet_entries.filter(e => e.timesheet_id === t.id);
      return {
        ...t,
        project_id: pr ? pr.id : null,
        project_name: pr ? pr.name : '',
        client_name: pr ? pr.client_name : '',
        employee_name: emp ? emp.name : '',
        billing_rate: ass ? ass.billing_rate : 0,
        weekly_hour_limit: ass ? ass.weekly_hour_limit : 40,
        pm_id: pr ? pr.project_manager_id : null,
        entries
      };
    });
    if (q.includes('where employee_id =')) {
      const empId = parseInt(params[0], 10);
      list = list.filter(t => t.employee_id === empId);
    }
    if (q.includes('where id =')) {
      const id = parseInt(params[0], 10);
      list = list.filter(t => t.id === id);
    }
    return { rows: list };
  }

  // Insert Timesheet
  if (q.startsWith('insert into timesheets')) {
    const id = memoryDb.timesheets.length + 1;
    const newTs = {
      id,
      assignment_id: parseInt(params[0], 10),
      employee_id: parseInt(params[1], 10),
      week_start: params[2],
      total_hours: parseFloat(params[3]),
      work_description: params[4],
      status: params[5] || 'DRAFT',
      rejection_reason: null,
      created_at: new Date().toISOString()
    };
    memoryDb.timesheets.push(newTs);

    // Insert entries if provided in query context
    return { rows: [newTs] };
  }

  // Insert Timesheet Entries
  if (q.startsWith('insert into timesheet_entries')) {
    const newEntry = {
      id: memoryDb.timesheet_entries.length + 1,
      timesheet_id: parseInt(params[0], 10),
      date: params[1],
      hours: parseFloat(params[2]),
      description: params[3]
    };
    memoryDb.timesheet_entries.push(newEntry);
    return { rows: [newEntry] };
  }

  // Update Timesheet
  if (q.startsWith('update timesheets')) {
    const id = parseInt(params[params.length - 1], 10);
    const tIndex = memoryDb.timesheets.findIndex(t => t.id === id);
    if (tIndex !== -1) {
      if (q.includes('status =') && q.includes('rejection_reason =')) {
        memoryDb.timesheets[tIndex].status = params[0];
        memoryDb.timesheets[tIndex].rejection_reason = params[1];
      } else if (q.includes('status =')) {
        memoryDb.timesheets[tIndex].status = params[0];
      } else if (params.length >= 3) {
        memoryDb.timesheets[tIndex].total_hours = parseFloat(params[0]);
        memoryDb.timesheets[tIndex].work_description = params[1];
        memoryDb.timesheets[tIndex].status = params[2];
        if (params[3]) memoryDb.timesheets[tIndex].rejection_reason = params[3];
      }
      return { rows: [memoryDb.timesheets[tIndex]] };
    }
    return { rows: [] };
  }

  // Delete Timesheet Entries for a timesheet (re-saving entries)
  if (q.startsWith('delete from timesheet_entries')) {
    const tsId = parseInt(params[0], 10);
    memoryDb.timesheet_entries = memoryDb.timesheet_entries.filter(e => e.timesheet_id !== tsId);
    return { rows: [] };
  }

  // Invoices Queries
  if (q.includes('from invoices')) {
    let list = memoryDb.invoices.map(inv => {
      const pr = memoryDb.projects.find(p => p.id === inv.project_id);
      const items = memoryDb.invoice_items.filter(item => item.invoice_id === inv.id);
      return {
        ...inv,
        project_name: pr ? pr.name : '',
        client_name: pr ? pr.client_name : '',
        items
      };
    });
    if (q.includes('where id =')) {
      const id = parseInt(params[0], 10);
      list = list.filter(i => i.id === id);
    }
    return { rows: list };
  }

  // Insert Invoice
  if (q.startsWith('insert into invoices')) {
    const id = memoryDb.invoices.length + 1;
    const newInv = {
      id,
      project_id: parseInt(params[0], 10),
      invoice_number: params[1],
      invoice_date: params[2],
      subtotal: parseFloat(params[3]),
      tax: parseFloat(params[4]),
      total: parseFloat(params[5]),
      status: params[6] || 'DRAFT',
      created_at: new Date().toISOString()
    };
    memoryDb.invoices.push(newInv);
    return { rows: [newInv] };
  }

  // Insert Invoice Item
  if (q.startsWith('insert into invoice_items')) {
    const newItem = {
      id: memoryDb.invoice_items.length + 1,
      invoice_id: parseInt(params[0], 10),
      type: params[1],
      reference_id: parseInt(params[2], 10),
      description: params[3],
      quantity: parseFloat(params[4]),
      rate: parseFloat(params[5]),
      amount: parseFloat(params[6])
    };
    memoryDb.invoice_items.push(newItem);
    return { rows: [newItem] };
  }

  // Update Invoice Status
  if (q.startsWith('update invoices')) {
    const id = parseInt(params[params.length - 1], 10);
    const iIndex = memoryDb.invoices.findIndex(inv => inv.id === id);
    if (iIndex !== -1) {
      memoryDb.invoices[iIndex].status = params[0];
      return { rows: [memoryDb.invoices[iIndex]] };
    }
    return { rows: [] };
  }

  // Notifications Queries
  if (q.includes('from notifications')) {
    let list = memoryDb.notifications;
    if (q.includes('where user_id =')) {
      const uid = parseInt(params[0], 10);
      list = list.filter(n => n.user_id === uid);
    }
    return { rows: list };
  }

  // Insert Notification
  if (q.startsWith('insert into notifications')) {
    const newNotif = {
      id: memoryDb.notifications.length + 1,
      user_id: parseInt(params[0], 10),
      message: params[1],
      type: params[2],
      read: false,
      created_at: new Date().toISOString()
    };
    memoryDb.notifications.push(newNotif);
    return { rows: [newNotif] };
  }

  // Update Notification Read
  if (q.startsWith('update notifications')) {
    const uid = parseInt(params[0], 10);
    memoryDb.notifications.forEach(n => {
      if (n.user_id === uid) n.read = true;
    });
    return { rows: [] };
  }

  return { rows: [] };
}
