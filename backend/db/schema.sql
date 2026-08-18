-- Schema for Contingent Workforce & Timesheet Tracker MVP (Multi-Tenant Multi-Vendor Enabled)

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS assignment_rate_history CASCADE;
DROP TABLE IF EXISTS contractor_payrolls CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS timesheet_entries CASCADE;
DROP TABLE IF EXISTS timesheets CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

-- Vendors (Multi-Tenant Org)
CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients (Owned by a Vendor)
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  vendor_id INT REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Scoped by vendor_id and optionally client_id)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  vendor_id INT REFERENCES vendors(id) ON DELETE SET NULL,
  client_id INT REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL DEFAULT 'password123',
  role VARCHAR(50) NOT NULL CHECK (role IN ('VENDOR_ADMIN', 'PROJECT_MANAGER', 'EMPLOYEE', 'CLIENT')),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  skills TEXT,
  availability VARCHAR(50) DEFAULT 'FULL_TIME',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects (Scoped by vendor_id and client_id)
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  vendor_id INT REFERENCES vendors(id) ON DELETE CASCADE,
  client_id INT REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  description TEXT,
  budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'REJECTED')),
  project_manager_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  employee_id INT REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  billing_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  weekly_hour_limit INT NOT NULL DEFAULT 40,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'COMPLETED', 'INACTIVE')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assignment_rate_history (
  id SERIAL PRIMARY KEY,
  assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE,
  rate NUMERIC(10, 2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE milestones (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED')),
  submitted_by INT REFERENCES users(id) ON DELETE SET NULL,
  evidence TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE timesheets (
  id SERIAL PRIMARY KEY,
  assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE,
  employee_id INT REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  work_description TEXT,
  status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE timesheet_entries (
  id SERIAL PRIMARY KEY,
  timesheet_id INT REFERENCES timesheets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
  description TEXT
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID')),
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policy for invoices (isolate_tenant)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolate_tenant_invoices ON invoices 
  USING (
    project_id IN (
      SELECT id FROM projects WHERE vendor_id = current_setting('app.vendor_id', true)::int
    )
  );

CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('TIMESHEET', 'MILESTONE')),
  reference_id INT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  rate NUMERIC(10, 2) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contractor_payrolls (
  id SERIAL PRIMARY KEY,
  milestone_id INT REFERENCES milestones(id) ON DELETE CASCADE,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  employee_id INT REFERENCES users(id) ON DELETE CASCADE,
  assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE,
  total_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  billing_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'PROCESSED' CHECK (status IN ('PENDING', 'PROCESSED', 'PAID')),
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policy for contractor_payrolls
ALTER TABLE contractor_payrolls ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolate_tenant_payrolls ON contractor_payrolls 
  USING (
    project_id IN (
      SELECT id FROM projects WHERE vendor_id = current_setting('app.vendor_id', true)::int
    )
  );

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  vendor_id INT REFERENCES vendors(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NOT NULL,
  actor_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
