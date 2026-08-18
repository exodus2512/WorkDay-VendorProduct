'use client';
import React from 'react';
import {
  Card,
  StatCard,
  StatusBadge,
  Table,
  Button,
  Alert,
  LoadingSpinner
} from '../components/UI.js';
import {
  Briefcase,
  Users,
  Clock,
  CheckSquare,
  DollarSign,
  Receipt,
  AlertTriangle,
  ArrowRight,
  Plus
} from 'lucide-react';

export default function AdminDashboard({ data, onNavigate, onRefresh }) {
  if (!data) return <LoadingSpinner text="Loading Vendor Admin Metrics..." />;

  const { projects = [], users = [], assignments = [], timesheets = [], milestones = [], invoices = [] } = data;

  // Metric Calculations
  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
  const activeContractors = users.filter(u => u.role === 'EMPLOYEE' && u.status === 'ACTIVE').length;
  const pendingTimesheets = timesheets.filter(t => t.status === 'SUBMITTED').length;
  const pendingMilestones = milestones.filter(m => m.status === 'SUBMITTED').length;

  // Billable calculation (approved unbilled timesheets and milestones)
  const approvedTimesheets = timesheets.filter(t => t.status === 'APPROVED');
  const approvedMilestones = milestones.filter(m => m.status === 'APPROVED');

  const timesheetBillable = approvedTimesheets.reduce((acc, t) => acc + (parseFloat(t.total_hours || 0) * parseFloat(t.billing_rate || 0)), 0);
  const milestoneBillable = approvedMilestones.reduce((acc, m) => acc + parseFloat(m.amount || 0), 0);
  const billableTotal = timesheetBillable + milestoneBillable;

  const outstandingInvoices = invoices.filter(i => i.status === 'SUBMITTED' || i.status === 'DRAFT');
  const outstandingAmount = outstandingInvoices.reduce((acc, i) => acc + parseFloat(i.total || 0), 0);

  const expiringAssignments = assignments.filter(a => a.status === 'EXPIRING_SOON' || new Date(a.end_date) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Vendor Admin Dashboard</h2>
          <p className="text-sky-200 text-sm mt-1">Manage client projects, contingent workforce assignments, rate cards & invoice validation.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => onNavigate('projects')} className="bg-sky-500 hover:bg-sky-400">
            <Plus className="w-4 h-4" /> New Project
          </Button>
          <Button variant="outline" onClick={() => onNavigate('billing')} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
            <Receipt className="w-4 h-4" /> Billable Hours
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Projects" value={activeProjects} icon={Briefcase} color="brand" change="Across 3 clients" />
        <StatCard label="Active Contractors" value={activeContractors} icon={Users} color="emerald" change="100% placed" />
        <StatCard label="Pending Approvals" value={pendingTimesheets + pendingMilestones} icon={Clock} color="amber" change={`${pendingTimesheets} TS, ${pendingMilestones} MS`} />
        <StatCard label="Billable Amount" value={`$${billableTotal.toLocaleString()}`} icon={DollarSign} color="indigo" change="Approved work" />
      </div>

      {/* Second Row: Outstanding Invoices & Expiring Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Outstanding Invoices" className="lg:col-span-2" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('invoices')}>View Invoices <ArrowRight className="w-3.5 h-3.5" /></Button>}>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No invoices generated yet.</p>
          ) : (
            <Table headers={['Invoice #', 'Client / Project', 'Subtotal', 'Tax (18%)', 'Total', 'Status']}>
              {invoices.slice(0, 4).map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900">{inv.invoice_number}</td>
                  <td className="px-6 py-3.5 font-medium">{inv.client_name || inv.project_name}</td>
                  <td className="px-6 py-3.5">${parseFloat(inv.subtotal).toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-slate-500">${parseFloat(inv.tax).toLocaleString()}</td>
                  <td className="px-6 py-3.5 font-bold text-sky-700">${parseFloat(inv.total).toLocaleString()}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        {/* Expiring Assignments Alert */}
        <Card title="Expiring Assignments">
          {expiringAssignments.length === 0 ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm">
              All contractor assignments are current and active.
            </div>
          ) : (
            <div className="space-y-3">
              <Alert type="warning" title="Contracts Expiring Soon">
                {expiringAssignments.length} assignment(s) require renewal or offboarding.
              </Alert>
              {expiringAssignments.map(a => (
                <div key={a.id} className="p-3 border border-amber-200 bg-amber-50/50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{a.employee_name}</p>
                    <p className="text-slate-600">{a.role} ({a.project_name})</p>
                    <p className="text-amber-700 font-semibold mt-0.5">Ends: {a.end_date}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('assignments')}>Manage</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Active Workforce Overview */}
      <Card title="Recent Workforce Assignments" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('assignments')}>All Assignments <ArrowRight className="w-3.5 h-3.5" /></Button>}>
        <Table headers={['Contractor', 'Project', 'Role', 'Billing Rate', 'Weekly Limit', 'Status']}>
          {assignments.slice(0, 5).map(a => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-6 py-3.5 font-bold text-slate-900">{a.employee_name}</td>
              <td className="px-6 py-3.5">{a.project_name}</td>
              <td className="px-6 py-3.5 font-medium text-slate-700">{a.role}</td>
              <td className="px-6 py-3.5 font-semibold text-emerald-700">${a.billing_rate}/hr</td>
              <td className="px-6 py-3.5 text-slate-600">{a.weekly_hour_limit} hrs/wk</td>
              <td className="px-6 py-3.5"><StatusBadge status={a.status} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
