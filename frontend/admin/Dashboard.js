'use client';
import React, { useMemo } from 'react';
import {
  Card,
  StatCard,
  Badge,
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

  const {
    projects = [],
    users = [],
    assignments = [],
    timesheets = [],
    milestones = [],
    invoices = []
  } = data;

  // Currency Formatter Helper
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    })}`;
  };

  // 1. DATA PROCESSING (useMemo for project profitability and agency totals)
  const {
    processedProjects,
    topProjects,
    agencyTotalRevenue,
    agencyTotalCost,
    agencyAverageMargin
  } = useMemo(() => {
    const projectList = Array.isArray(projects) ? projects : [];
    const milestoneList = Array.isArray(milestones) ? milestones : [];
    const assignmentList = Array.isArray(assignments) ? assignments : [];
    const timesheetList = Array.isArray(timesheets) ? timesheets : [];

    const calculated = projectList.map((project) => {
      // 1. Earned Revenue: Sum of APPROVED or COMPLETED milestones for this project
      const relatedMilestones = milestoneList.filter(
        (m) => Number(m.project_id) === Number(project.id)
      );

      // Earned Revenue (Approved / Completed milestones)
      const earnedMilestones = relatedMilestones.filter(
        (m) => String(m.status).toUpperCase() === 'APPROVED' || String(m.status).toUpperCase() === 'COMPLETED'
      );

      let revenue = earnedMilestones.reduce((acc, m) => {
        const fee = parseFloat(m.milestone_fee ?? m.amount ?? 0) || 0;
        return acc + fee;
      }, 0);

      // If no milestones are approved/completed yet, use total project budget as total scope revenue
      // but only if contractors have logged work; otherwise scope revenue = total milestone scope
      const totalMilestoneScope = relatedMilestones.reduce((acc, m) => acc + (parseFloat(m.amount || 0) || 0), 0);
      const totalRevenueScope = totalMilestoneScope > 0 ? totalMilestoneScope : (parseFloat(project.budget) || 0);

      // 2. Incurred Cost: Sum of (total_hours * rate) for APPROVED and SUBMITTED timesheets
      const relatedAssignments = assignmentList.filter(
        (a) => Number(a.project_id) === Number(project.id)
      );

      let cost = 0;
      relatedAssignments.forEach((assignment) => {
        const relatedTimesheets = timesheetList.filter(
          (t) =>
            Number(t.assignment_id) === Number(assignment.id) &&
            (String(t.status).toUpperCase() === 'APPROVED' || String(t.status).toUpperCase() === 'SUBMITTED')
        );

        relatedTimesheets.forEach((t) => {
          const hours = parseFloat(t.total_hours || 0) || 0;
          const payPerHour = parseFloat(
            assignment.pay_per_hour ??
            t.pay_per_hour ??
            assignment.billing_rate ??
            t.billing_rate ??
            0
          ) || 0;
          cost += hours * payPerHour;
        });
      });

      // Effective revenue for margin calculation: use total scope revenue if project is active, otherwise earned revenue
      const displayRevenue = revenue > 0 ? revenue : totalRevenueScope;

      // Project Gross Profit = Display Revenue - Cost
      const grossProfit = displayRevenue - cost;

      // Margin % calculation: Only show margin > 0 if displayRevenue > 0 and cost > 0
      // If cost is 0 and no timesheets exist yet, margin is 0 (or pending work)
      let margin = 0;
      if (displayRevenue > 0 && cost > 0) {
        margin = (grossProfit / displayRevenue) * 100;
      } else if (displayRevenue > 0 && cost === 0 && relatedAssignments.length > 0) {
        margin = 0; // Contractor cost not logged yet — avoid fake 100%
      }

      return {
        ...project,
        revenue: displayRevenue,
        earnedRevenue: revenue,
        cost,
        grossProfit,
        margin
      };
    });

    // Agency Total Revenue = Sum of all Project Revenues
    const totalRev = calculated.reduce((acc, p) => acc + p.revenue, 0);

    // Agency Total Cost = Sum of all Project Costs
    const totalCost = calculated.reduce((acc, p) => acc + p.cost, 0);

    // Agency Average Margin = ((Total Revenue - Total Cost) / Total Revenue) * 100
    const avgMargin = totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 0;

    // Top 5 Projects: Sort the processed projects array by Gross Profit descending and slice top 5
    const top5 = [...calculated]
      .sort((a, b) => b.grossProfit - a.grossProfit)
      .slice(0, 5);

    return {
      processedProjects: calculated,
      topProjects: top5,
      agencyTotalRevenue: totalRev,
      agencyTotalCost: totalCost,
      agencyAverageMargin: avgMargin
    };
  }, [projects, milestones, assignments, timesheets]);

  // Helper for Margin badge styling (>40% green, 15%-40% yellow, <15% red)
  const getMarginBadgeVariant = (margin) => {
    if (margin > 40) return 'success';
    if (margin >= 15) return 'warning';
    return 'danger';
  };

  // Operational Metric Calculations
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const activeContractors = users.filter(
    (u) => u.role === 'EMPLOYEE' && u.status === 'ACTIVE'
  ).length;
  const pendingTimesheets = timesheets.filter((t) => t.status === 'SUBMITTED').length;
  const pendingMilestones = milestones.filter((m) => m.status === 'SUBMITTED').length;

  // Billable calculation (approved unbilled timesheets and milestones)
  const approvedTimesheets = timesheets.filter((t) => t.status === 'APPROVED');
  const approvedMilestones = milestones.filter((m) => m.status === 'APPROVED');

  const timesheetBillable = approvedTimesheets.reduce(
    (acc, t) => acc + parseFloat(t.total_hours || 0) * parseFloat(t.billing_rate || 0),
    0
  );
  const milestoneBillable = approvedMilestones.reduce(
    (acc, m) => acc + parseFloat(m.amount || 0),
    0
  );
  const billableTotal = timesheetBillable + milestoneBillable;

  const outstandingInvoices = invoices.filter(
    (i) => i.status === 'SUBMITTED' || i.status === 'DRAFT'
  );
  const expiringAssignments = assignments.filter(
    (a) =>
      a.status === 'EXPIRING_SOON' ||
      new Date(a.end_date) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Vendor Admin Dashboard</h2>
          <p className="text-sky-200 text-sm mt-1">
            Manage client projects, contingent workforce assignments, rate cards & invoice validation.
          </p>
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

      {/* 2.A Executive Overview (Top Row) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Executive Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Expected Revenue"
            value={formatCurrency(agencyTotalRevenue)}
            icon={DollarSign}
            color="brand"
            change="Cumulative project revenue"
          />
          <StatCard
            label="Total Payroll Cost"
            value={formatCurrency(agencyTotalCost)}
            icon={Users}
            color="amber"
            change="Approved contractor hours"
          />
          <StatCard
            label="Average Agency Margin"
            value={`${agencyAverageMargin.toFixed(1)}%`}
            icon={ArrowRight}
            color={agencyAverageMargin > 0 ? 'emerald' : 'rose'}
            trend={agencyAverageMargin > 0 ? 'up' : 'down'}
            change={agencyAverageMargin > 0 ? '↑ Profitable overall' : 'Below target'}
          />
        </div>
      </div>

      {/* 2.B Profitability Leaderboard */}
      <Card
        title="Profitability Leaderboard"
        action={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('projects')}>
            All Projects <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        }
      >
        {topProjects.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No projects available for profitability leaderboard.</p>
        ) : (
          <Table headers={['Project Name', 'Total Revenue', 'Total Cost', 'Gross Profit', 'Margin %']}>
            {topProjects.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="font-bold text-slate-900">{p.name}</div>
                  {p.client_name && <div className="text-xs text-slate-500">{p.client_name}</div>}
                </td>
                <td className="px-6 py-3.5 font-medium text-slate-900">{formatCurrency(p.revenue)}</td>
                <td className="px-6 py-3.5 text-slate-600">{formatCurrency(p.cost)}</td>
                <td className={`px-6 py-3.5 font-bold ${p.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(p.grossProfit)}
                </td>
                <td className="px-6 py-3.5">
                  <Badge variant={getMarginBadgeVariant(p.margin)}>
                    {p.margin.toFixed(1)}%
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Operational Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Projects" value={activeProjects} icon={Briefcase} color="brand" change="Across active clients" />
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


