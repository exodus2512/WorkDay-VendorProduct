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
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function PMDashboard({ data, pmUser, onNavigate, onRefresh }) {
  if (!data) return <LoadingSpinner text="Loading Project Manager Dashboard..." />;

  const { projects = [], users = [], assignments = [], timesheets = [], milestones = [] } = data;

  const myProjects = projects.filter(p => p.project_manager_id === pmUser.id);
  const myProjectIds = myProjects.map(p => p.id);

  const myAssignments = assignments.filter(a => myProjectIds.includes(a.project_id));
  const myContractorCount = new Set(myAssignments.map(a => a.employee_id)).size;

  const myTimesheets = timesheets.filter(t => myProjectIds.includes(t.project_id));
  const pendingTimesheets = myTimesheets.filter(t => t.status === 'SUBMITTED');

  const myMilestones = milestones.filter(m => myProjectIds.includes(m.project_id));
  const pendingMilestones = myMilestones.filter(m => m.status === 'SUBMITTED');

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueMilestones = myMilestones.filter(m => m.status !== 'COMPLETED' && m.status !== 'APPROVED' && m.due_date < todayStr);

  // Monitoring issues check (Requirement 8): Excessive hours (> weekly limit)
  const excessiveHoursTs = myTimesheets.filter(t => {
    const ass = assignments.find(a => a.id === t.assignment_id);
    return ass && parseFloat(t.total_hours) > parseInt(ass.weekly_hour_limit, 10);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Project Manager Command Center</h2>
          <p className="text-sky-200 text-sm mt-1">Logged in as <span className="font-bold text-white">{pmUser.name}</span>. Manage project deliverables and contractor approvals.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => onNavigate('timesheets')} className="bg-sky-500 hover:bg-sky-400">
            <Clock className="w-4 h-4" /> Review Timesheets ({pendingTimesheets.length})
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Assigned Projects" value={myProjects.length} icon={Briefcase} color="brand" change="Active projects" />
        <StatCard label="Team Contractors" value={myContractorCount} icon={Users} color="emerald" change="Under management" />
        <StatCard label="Pending Timesheets" value={pendingTimesheets.length} icon={Clock} color="amber" change="Awaiting review" />
        <StatCard label="Pending Milestones" value={pendingMilestones.length} icon={CheckSquare} color="indigo" change="Evidence submitted" />
      </div>

      {/* Monitoring & Exception Alerts Section (Section 8 PM Monitoring) */}
      {(overdueMilestones.length > 0 || excessiveHoursTs.length > 0) && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 text-base">PM Operational Monitoring Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overdueMilestones.length > 0 && (
              <Alert type="danger" title="Overdue Milestones Alert">
                {overdueMilestones.length} milestone(s) have passed their due date without approved completion evidence.
              </Alert>
            )}
            {excessiveHoursTs.length > 0 && (
              <Alert type="warning" title="Excessive Hours Alert">
                {excessiveHoursTs.length} timesheet(s) submitted with hours exceeding contractual weekly limits.
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Main Action Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Timesheets Review Quick Action */}
        <Card title="Timesheets Requiring PM Approval" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('timesheets')}>All Timesheets <ArrowRight className="w-3.5 h-3.5" /></Button>}>
          {pendingTimesheets.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">All timesheets reviewed!</p>
              <p className="text-xs">No pending contractor timesheets queued for approval.</p>
            </div>
          ) : (
            <Table headers={['Contractor', 'Project', 'Submitted Hours', 'Week Start', 'Action']}>
              {pendingTimesheets.slice(0, 4).map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900 text-xs">{t.employee_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{t.project_name}</td>
                  <td className="px-4 py-3 font-extrabold text-sky-700 text-xs">{t.total_hours} hrs</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.week_start}</td>
                  <td className="px-4 py-3">
                    <Button variant="primary" size="sm" onClick={() => onNavigate('timesheets')}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        {/* Pending Milestones Quick Review */}
        <Card title="Milestone Completion Submissions" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('milestones')}>All Milestones <ArrowRight className="w-3.5 h-3.5" /></Button>}>
          {pendingMilestones.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No pending milestone reviews.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMilestones.map(m => (
                <div key={m.id} className="p-3 border rounded-xl bg-slate-50/60 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{m.name}</p>
                    <p className="text-slate-600">Submitted by: {m.submitted_by_name || 'Contractor'}</p>
                    <p className="text-emerald-700 font-bold mt-0.5">${parseFloat(m.amount).toLocaleString()}</p>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => onNavigate('milestones')}>
                    Review Evidence
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Assigned Projects Table */}
      <Card title="My Managed Projects">
        <Table headers={['Project Name', 'Client Name', 'Budget', 'Start / End Date', 'Team Size', 'Status']}>
          {myProjects.map(p => {
            const pAss = assignments.filter(a => a.project_id === p.id);
            return (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-900">{p.name}</td>
                <td className="px-6 py-4 font-semibold text-slate-700">{p.client_name}</td>
                <td className="px-6 py-4 font-bold text-emerald-700">${parseFloat(p.budget).toLocaleString()}</td>
                <td className="px-6 py-4 text-xs text-slate-600">{p.start_date} to {p.end_date}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{pAss.length} contractors</td>
                <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
