'use client';
import React from 'react';
import { Card, Table, StatusBadge, Badge } from '../components/UI.js';
import { Users, Clock, ShieldCheck } from 'lucide-react';

export default function PMTeam({ projects = [], pmUser, assignments = [], users = [] }) {
  const myProjects = projects.filter(p => p.project_manager_id === pmUser.id);
  const myProjectIds = myProjects.map(p => p.id);
  const myAssignments = assignments.filter(a => myProjectIds.includes(a.project_id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Project Team & Contractor Workload</h2>
        <p className="text-sm text-slate-500">Monitor contractor roles, contractual hour limits, and active project allocations.</p>
      </div>

      <Card>
        <Table headers={['Contractor Name', 'Assigned Project', 'Contract Role', 'Contract Period', 'Rate Card', 'Weekly Limit', 'Status']}>
          {myAssignments.map(a => {
            const emp = users.find(u => u.id === a.employee_id);
            return (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{a.employee_name}</div>
                  <div className="text-xs text-slate-500">{a.employee_email}</div>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">{a.project_name}</td>
                <td className="px-6 py-4 text-xs font-semibold text-sky-700">{a.role}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{a.start_date} to {a.end_date}</td>
                <td className="px-6 py-4 font-bold text-emerald-700">${parseFloat(a.billing_rate).toFixed(2)}/hr</td>
                <td className="px-6 py-4 font-semibold text-slate-700">{a.weekly_hour_limit} hrs/wk</td>
                <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
