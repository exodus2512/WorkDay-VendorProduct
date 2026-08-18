-- Multi-Tenant Seed Data (2 Vendors, 4 Clients)

-- 1. Vendors
INSERT INTO vendors (id, name, code) VALUES
(1, 'VendorCorp Global', 'VENDOR_CORP'),
(2, 'Acme Workforce Solutions', 'ACME_SOLUTIONS');

SELECT setval('vendors_id_seq', 2, true);

-- 2. Clients
INSERT INTO clients (id, vendor_id, name) VALUES
(1, 1, 'Apex Financial Services'),
(2, 1, 'Logistics Global Inc.'),
(3, 1, 'BioCare Health Network'),
(4, 2, 'Nexus Retail Systems');

SELECT setval('clients_id_seq', 4, true);

-- 3. Users (Multi-tenant scoped by vendor_id and client_id)
-- Passwords are bcrypt-hashed. Default staff password: password123 | Client password: client
INSERT INTO users (id, vendor_id, client_id, name, email, password, role, status, skills, availability) VALUES
(1,  1, NULL, 'Eleanor Vance',  'eleanor.vance@vendorcorp.com',  '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'VENDOR_ADMIN',    'ACTIVE',      'Workforce Planning, Vendor Management, Executive Billing',   'FULL_TIME'),
(2,  1, NULL, 'Sarah Jenkins',  'sarah.j@vendorcorp.com',        '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'PROJECT_MANAGER', 'ACTIVE',      'Agile Delivery, Cloud Architecture, Scrum',                 'FULL_TIME'),
(3,  1, NULL, 'David Miller',   'david.m@vendorcorp.com',        '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'PROJECT_MANAGER', 'ACTIVE',      'ERP Implementation, Financial Tech, Technical Lead',          'FULL_TIME'),
(4,  1, NULL, 'Alex Rivera',    'alex.rivera@contractor.io',     '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'EMPLOYEE',        'ACTIVE',      'React, Next.js, Tailwind CSS, Node.js',                      'FULL_TIME'),
(5,  1, NULL, 'Marcus Chen',    'marcus.chen@contractor.io',     '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'EMPLOYEE',        'ACTIVE',      'PostgreSQL, Database Tuning, Go, Backend API',                'FULL_TIME'),
(6,  1, NULL, 'Elena Rostova',  'elena.rostova@contractor.io',   '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'EMPLOYEE',        'ACTIVE',      'UI/UX Design, Figma, Design Systems, Frontend',              'PART_TIME'),
(7,  1, NULL, 'Devon Smith',    'devon.smith@contractor.io',     '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'EMPLOYEE',        'ACTIVE',      'DevOps, Kubernetes, AWS, Terraform',                         'FULL_TIME'),
(8,  1, NULL, 'Priya Patel',    'priya.patel@contractor.io',     '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'EMPLOYEE',        'ACTIVE',      'QA Automation, Cypress, Jest, Integration Testing',          'FULL_TIME'),
(9,  1, NULL, 'Jordan Lee',     'jordan.lee@contractor.io',      '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'EMPLOYEE',        'ACTIVE',      'Python, Data Analytics, ETL, Snowflake',                     'FULL_TIME'),
(10, 1, NULL, 'Sam Taylor',     'sam.taylor@contractor.io',      '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'EMPLOYEE',        'UNAVAILABLE', 'iOS, Swift, Mobile Security',                                'UNAVAILABLE'),
(11, 1, NULL, 'Taylor Reed',    'taylor.reed@contractor.io',     '$2b$10$Drrm/mF5exDz6/Yg7IiCLOE5DuQ2e.gcnH/EVx7vGvIbMCRulE4Rm', 'EMPLOYEE',        'ACTIVE',      'Fullstack JavaScript, GraphQL, Micro-frontends',             'FULL_TIME'),
(12, 1, 1,    'Apex Financial',  'client@client.com',             '$2b$10$.O/fW8bu7/nPtn1jJP9hpOcVIWh5yOne674cZ.I6HmuzUuOwR4WaW',  'CLIENT',          'ACTIVE',      'Project Commissioning',                                      'FULL_TIME');

SELECT setval('users_id_seq', 12, true);

-- 4. Projects (Scoped by vendor_id and client_id)
INSERT INTO projects (id, vendor_id, client_id, name, client_name, description, budget, start_date, end_date, status, project_manager_id) VALUES
(1, 1, 1, 'Apex Fintech Modernization', 'Apex Financial Services', 'Full overhaul of core trading portal and client dashboard with modern web stack.', 250000.00, '2026-06-01', '2026-12-31', 'ACTIVE', 2),
(2, 1, 2, 'Cloud Migration & Data Pipeline', 'Logistics Global Inc.', 'Migrating legacy ERP workloads to AWS cloud with automated Snowflake ETL pipelines.', 180000.00, '2026-07-15', '2026-11-30', 'ACTIVE', 3),
(3, 1, 3, 'Healthcare AI Analytics Portal', 'BioCare Health Network', 'HIPAA compliant portal for patient telemetry and automated diagnostic reporting.', 140000.00, '2026-08-01', '2026-10-31', 'PENDING', 2);

SELECT setval('projects_id_seq', 3, true);

-- 5. Assignments
INSERT INTO assignments (id, project_id, employee_id, role, start_date, end_date, billing_rate, weekly_hour_limit, status) VALUES
(1, 1, 4, 'Senior Frontend Engineer', '2026-06-01', '2026-12-31', 85.00, 40, 'ACTIVE'),
(2, 1, 5, 'Lead Database Architect', '2026-06-01', '2026-12-31', 95.00, 40, 'ACTIVE'),
(3, 1, 6, 'Principal UI/UX Designer', '2026-06-15', '2026-09-30', 75.00, 20, 'ACTIVE'),
(4, 2, 7, 'DevOps Specialist', '2026-07-15', '2026-11-30', 90.00, 40, 'ACTIVE'),
(5, 2, 9, 'Data Analytics Engineer', '2026-07-15', '2026-11-30', 80.00, 40, 'ACTIVE'),
(6, 1, 8, 'QA Automation Lead', '2026-07-01', '2026-08-25', 70.00, 40, 'EXPIRING_SOON'),
(7, 2, 11, 'Fullstack Integrator', '2026-08-01', '2026-11-30', 85.00, 40, 'ACTIVE'),
(8, 3, 4, 'Mobile Web Consultant', '2026-08-15', '2026-10-31', 95.00, 20, 'ACTIVE');

SELECT setval('assignments_id_seq', 8, true);

-- 6. Milestones
INSERT INTO milestones (id, project_id, name, description, amount, due_date, status, submitted_by, evidence, rejection_reason) VALUES
(1, 1, 'M1: Architecture Blueprint & UX Wireframes', 'Complete technical architecture document and sign-off on high-fidelity designs.', 25000.00, '2026-06-30', 'COMPLETED', 4, 'https://docs.vendorcorp.com/apex-arch-v1.pdf', NULL),
(2, 1, 'M2: Authentication & Core Dashboard UI', 'Deliver OAuth2 integration, role control, and main reactive dashboard screens.', 45000.00, '2026-08-15', 'APPROVED', 4, 'https://github.com/vendorcorp/apex-portal/pull/42 - All automated E2E tests passing.', NULL),
(3, 1, 'M3: Payment Engine & Order Placement', 'Real-time WebSocket market ticker feed and trade execution workflow.', 50000.00, '2026-10-15', 'APPROVED', 4, 'http://localhost:3000/', NULL),
(4, 2, 'M1: Cloud Infrastructure Provisioning', 'Terraform scripts for VPC, EKS cluster, IAM security policies, and RDS Postgres.', 35000.00, '2026-08-10', 'APPROVED', 7, 'https://aws.console.vendorcorp.com/terraform-run-log-882.txt', NULL),
(5, 2, 'M2: Snowflake Data Pipeline Ingestion', 'ETL pipeline for daily ingestion of 10M records with error fallback alerting.', 40000.00, '2026-09-30', 'APPROVED', 4, 'v', NULL),
(6, 3, 'M1: HIPAA Compliance & Security Audit', 'Third-party audit verification for encrypted data storage and patient privacy.', 20000.00, '2026-08-20', 'APPROVED', 4, 'http://localhost:3000/', NULL);

SELECT setval('milestones_id_seq', 6, true);

-- 7. Timesheets
INSERT INTO timesheets (id, assignment_id, employee_id, week_start, total_hours, work_description, status, rejection_reason) VALUES
(1, 1, 4, '2026-08-03', 40.00, 'Developed reactive dashboard components, integrated chart widgets, fixed CSS layout edge cases.', 'APPROVED', NULL),
(2, 2, 5, '2026-08-03', 40.00, 'Optimized query execution plans, set up read-replica indexing, tuned Postgres connection pool.', 'APPROVED', NULL),
(3, 1, 4, '2026-08-10', 40.00, 'Implemented timesheet validation modal, header role selector, and interactive dashboard tables.', 'SUBMITTED', NULL),
(4, 2, 5, '2026-08-10', 38.50, 'Configured database schema migrations and automated Neon database seed runner.', 'SUBMITTED', NULL),
(5, 3, 6, '2026-08-03', 20.00, 'Designed UI components, dark mode color palette, and micro-animations for invoice flow.', 'APPROVED', NULL),
(6, 4, 7, '2026-08-10', 42.00, 'Provisioned production Kubernetes cluster and resolved ingress controller DNS routing issue.', 'REJECTED', 'Hours exceed 40-hour weekly limit without prior overtime pre-authorization. Please update to 40 hours.'),
(7, 5, 9, '2026-08-10', 35.00, 'Built SQL transformation scripts for data ingestion pipeline and validated test benchmarks.', 'DRAFT', NULL);

SELECT setval('timesheets_id_seq', 7, true);

-- 8. Timesheet Entries
INSERT INTO timesheet_entries (id, timesheet_id, date, hours, description) VALUES
(1, 1, '2026-08-03', 8.00, 'Header and Sidebar responsive design'),
(2, 1, '2026-08-04', 8.00, 'Dashboard metric cards component'),
(3, 1, '2026-08-05', 8.00, 'Role switching state context'),
(4, 1, '2026-08-06', 8.00, 'Invoice generation form state'),
(5, 1, '2026-08-07', 8.00, 'Testing and bug fixes for release'),
(6, 2, '2026-08-03', 8.00, 'DB schema optimization'),
(7, 2, '2026-08-04', 8.00, 'Neon serverless pool testing');

SELECT setval('timesheet_entries_id_seq', 7, true);

-- 9. Invoices & Items
INSERT INTO invoices (id, project_id, invoice_number, invoice_date, subtotal, tax, total, status) VALUES
(1, 1, 'INV-2026-001', '2026-08-15', 28400.00, 5112.00, 33512.00, 'APPROVED'),
(2, 2, 'INV-2026-002', '2026-08-16', 35000.00, 6300.00, 41300.00, 'SUBMITTED');

SELECT setval('invoices_id_seq', 2, true);

INSERT INTO invoice_items (id, invoice_id, type, reference_id, description, quantity, rate, amount) VALUES
(1, 1, 'TIMESHEET', 1, 'Timesheet #1 - Alex Rivera (40 hrs @ $85.00/hr)', 40.00, 85.00, 3400.00),
(2, 1, 'TIMESHEET', 2, 'Timesheet #2 - Marcus Chen (40 hrs @ $95.00/hr)', 40.00, 95.00, 3800.00),
(3, 1, 'TIMESHEET', 5, 'Timesheet #5 - Elena Rostova (20 hrs @ $75.00/hr)', 20.00, 75.00, 1500.00),
(4, 1, 'MILESTONE', 1, 'Milestone #1 - M1: Architecture Blueprint & UX Wireframes', 1.00, 23100.00, 23100.00),
(5, 2, 'MILESTONE', 4, 'Milestone #4 - M1: Cloud Infrastructure Provisioning', 1.00, 35000.00, 35000.00);

SELECT setval('invoice_items_id_seq', 5, true);

-- 10. Notifications
INSERT INTO notifications (id, user_id, message, type, read) VALUES
(1, 4, 'Your timesheet for week starting 2026-08-03 (40 hrs) was APPROVED by Sarah Jenkins.', 'TIMESHEET_APPROVED', true),
(2, 5, 'Your timesheet for week starting 2026-08-03 (40 hrs) was APPROVED by Sarah Jenkins.', 'TIMESHEET_APPROVED', true),
(3, 7, 'Your timesheet for week 2026-08-10 was REJECTED: Hours exceed 40-hour limit.', 'TIMESHEET_REJECTED', false),
(4, 2, 'Milestone M2 submitted by Alex Rivera requires your review.', 'MILESTONE_SUBMITTED', false),
(5, 1, 'Invoice INV-2026-002 was submitted for client Logistics Global Inc.', 'INVOICE_SUBMITTED', false);

SELECT setval('notifications_id_seq', 5, true);

-- 11. Contractor Payrolls
INSERT INTO contractor_payrolls (id, milestone_id, project_id, employee_id, assignment_id, total_hours, billing_rate, gross_pay, status) VALUES
(1, 1, 1, 4, 1, 40.00, 85.00, 3400.00, 'PROCESSED'),
(2, 1, 1, 5, 2, 40.00, 95.00, 3800.00, 'PROCESSED');

SELECT setval('contractor_payrolls_id_seq', 2, true);
