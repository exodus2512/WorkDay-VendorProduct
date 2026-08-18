# WorkForce - Contingent Workforce & Timesheet Tracker MVP

Production-style hackathon MVP for contingent workforce management, timesheet logging, milestone billing, and automated invoice validation using **Next.js (App Router)**, **JavaScript**, **Tailwind CSS**, and **Neon PostgreSQL**.

---

## Key Features

- **Role-Based Portals & Live Switcher**:
  - **Vendor Admin**: Manage client proposals, workforce availability, rate cards, billable hours consolidation, and 7-rule invoice pre-submission validation.
  - **Project Manager**: Review team workload, approve/reject weekly timesheet logs, verify milestone deliverables and work evidence.
  - **Employee / Contractor**: Log weekly daily hours (Mon–Sun), submit project milestones, track billable status, and receive real-time notifications.
- **Invoice Pre-Submission Validation Engine (`backend/utils/billing.js`)**:
  - 7 mandatory audit checks: Active assignment check, Active assignment status, Approved hours check, Contract rate matching, Approved milestones, Duplicate billing prevention, and 18% tax calculation check.
- **Neon PostgreSQL Database Driver**:
  - Uses `@neondatabase/serverless` for database queries with automatic table initialization (`schema.sql`) and realistic seed data (`seed.sql`).

### Financial Settlement: Payroll Driven by Client Payment

In this system, contractor payroll generation is explicitly coupled to client invoice settlement. Payroll records (`contractor_payrolls`) are generated automatically when a client invoice reaches `PAID` status. Once the invoice is accepted and paid, payouts are processed for all associated timesheets and milestone deliverables included in the invoice, ensuring financial alignment between vendor receivables and contractor disbursemenets.

---

## Directory Architecture

```text
WordDay-VendorProduct/
├── app/
│   ├── layout.js
│   ├── page.js
│   ├── globals.css
│   └── api/
│       └── [...slug]/route.js
├── frontend/
│   ├── components/
│   │   ├── Sidebar.js
│   │   ├── Header.js
│   │   └── UI.js
│   ├── admin/
│   │   ├── Dashboard.js
│   │   ├── Projects.js
│   │   ├── Workforce.js
│   │   ├── Assignments.js
│   │   ├── Billing.js
│   │   └── Invoices.js
│   ├── pm/
│   │   ├── Dashboard.js
│   │   ├── Projects.js
│   │   ├── Team.js
│   │   ├── Timesheets.js
│   │   └── Milestones.js
│   └── employee/
│       ├── Dashboard.js
│       ├── Assignment.js
│       ├── Timesheets.js
│       ├── Milestones.js
│       └── Notifications.js
├── backend/
│   ├── api/
│   │   ├── projects.js
│   │   ├── employees.js
│   │   ├── assignments.js
│   │   ├── timesheets.js
│   │   ├── milestones.js
│   │   ├── invoices.js
│   │   └── notifications.js
│   ├── db/
│   │   ├── db.js
│   │   ├── schema.sql
│   │   ├── seed.sql
│   │   └── init.js
│   └── utils/
│       └── billing.js
├── .env.local
├── package.json
└── README.md
```

---

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database** (Optional if live Neon URL provided in `.env.local`):
   ```bash
   npm run db:init
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## End-to-End Demo Workflow

1. Select **Vendor Admin (Eleanor Vance)** in the top header. Accept client project proposal, assign PM, assign contractor Alex Rivera at $85/hr.
2. Select **Employee (Alex Rivera)** in the header. Create a weekly timesheet (40 hrs), enter daily tasks, and click **Submit to PM**.
3. Select **Project Manager (Sarah Jenkins)**. Open **Timesheets**, review Alex Rivera's entries, and click **Approve**.
4. Select **Employee (Alex Rivera)**. Open **Milestones**, submit deliverable evidence for "M2: Authentication & Core Dashboard UI".
5. Select **Project Manager (Sarah Jenkins)**. Open **Milestones** and click **Approve Deliverable**.
6. Select **Vendor Admin (Eleanor Vance)**. Open **Billable Hours**, select project, and click **Run Invoice Validation**. Verify all 7 rules pass, then click **Generate & Save Invoice**, and submit it for payment!
