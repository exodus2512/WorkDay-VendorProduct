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
  Clock,
  CheckSquare,
  Bell,
  ArrowRight,
  Plus,
  DollarSign,
  UserCheck
} from 'lucide-react';

export default function EmployeeDashboard({ data, empUser, onNavigate }) {
  if (!data) return <LoadingSpinner text="Loading Contractor Workspace..." />;

  const { assignments = [], timesheets = [], milestones = [], notifications = [] } = data;

  const myAssignments = assignments.filter(a => a.employee_id === empUser.id && a.status === 'ACTIVE');
  const primaryAssignment = myAssignments[0] || assignments[0];

  const myTimesheets = timesheets.filter(t => t.employee_id === empUser.id);
  const submittedHours = myTimesheets.filter(t => t.status === 'SUBMITTED').reduce((acc, t) => acc + parseFloat(t.total_hours || 0), 0);
  const approvedHours = myTimesheets.filter(t => t.status === 'APPROVED').reduce((acc, t) => acc + parseFloat(t.total_hours || 0), 0);

  const rejectedTs = myTimesheets.filter(t => t.status === 'REJECTED');

  const unreadNotifs = notifications.filter(n => n.user_id === empUser.id && !n.read);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Welcome back, {empUser.name}!</h2>
          <p className="text-sky-200 text-sm mt-1">Contractor Portal & Timesheet Logbook.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => onNavigate('timesheets')} className="bg-sky-500 hover:bg-sky-400">
            <Plus className="w-4 h-4" /> Log Weekly Hours
          </Button>
        </div>
      </div>

      {/* Rejection alert if any */}
      {rejectedTs.length > 0 && (
        <Alert type="danger" title="Timesheet Needs Revision">
          You have {rejectedTs.length} rejected timesheet(s). Please review PM feedback and resubmit.
        </Alert>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Assignment" value={primaryAssignment ? primaryAssignment.project_name : 'None'} icon={Briefcase} color="brand" change={primaryAssignment ? primaryAssignment.role : 'Unassigned'} />
        <StatCard label="Contract Billing Rate" value={primaryAssignment ? `$${primaryAssignment.billing_rate}/hr` : '$0'} icon={DollarSign} color="emerald" change={primaryAssignment ? `Limit: ${primaryAssignment.weekly_hour_limit} hrs/wk` : ''} />
        <StatCard label="Approved Hours" value={`${approvedHours} hrs`} icon={Clock} color="indigo" change="Billable work logged" />
        <StatCard label="Notifications" value={unreadNotifs.length} icon={Bell} color="amber" change="Unread messages" />
      </div>

      {/* Active Assignment Card */}
      {primaryAssignment ? (
        <Card title="Current Project Assignment" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('assignment')}>Details <ArrowRight className="w-3.5 h-3.5" /></Button>}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-xl border">
              <p className="text-xs uppercase font-bold text-slate-400">Project & Client</p>
              <p className="font-extrabold text-slate-900 mt-1">{primaryAssignment.project_name}</p>
              <p className="text-xs text-slate-600">{primaryAssignment.client_name}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border">
              <p className="text-xs uppercase font-bold text-slate-400">Project Manager</p>
              <p className="font-bold text-slate-900 mt-1">{primaryAssignment.pm_name}</p>
              <p className="text-xs text-slate-600">Primary Approver</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border">
              <p className="text-xs uppercase font-bold text-slate-400">Contract Period</p>
              <p className="font-bold text-slate-900 mt-1">{primaryAssignment.start_date} to {primaryAssignment.end_date}</p>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">Rate: ${primaryAssignment.billing_rate}/hr</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Current Project Assignment">
          <p className="text-slate-500 text-sm py-4">No active assignment currently active.</p>
        </Card>
      )}

      {/* Recent Timesheets & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="My Recent Weekly Timesheets" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('timesheets')}>All Logbooks <ArrowRight className="w-3.5 h-3.5" /></Button>}>
          {myTimesheets.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No timesheets logged yet.</p>
          ) : (
            <Table headers={['Week Start', 'Hours', 'Status', 'Action']}>
              {myTimesheets.slice(0, 4).map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-bold text-slate-900">{t.week_start}</td>
                  <td className="px-4 py-3 text-xs font-bold text-sky-700">{t.total_hours} hrs</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => onNavigate('timesheets')}>View</Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        {/* Notifications preview */}
        <Card title="Recent Notifications" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('notifications')}>All Notifications <ArrowRight className="w-3.5 h-3.5" /></Button>}>
          <div className="space-y-3">
            {notifications.filter(n => n.user_id === empUser.id).slice(0, 4).map(n => (
              <div key={n.id} className={`p-3 rounded-xl border text-xs ${n.read ? 'bg-white border-slate-200' : 'bg-sky-50/60 border-sky-200 font-medium'}`}>
                <p className="text-slate-800 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
