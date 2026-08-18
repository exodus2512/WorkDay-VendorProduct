'use client';
import React from 'react';
import { Card, StatusBadge, Badge } from '../components/UI.js';
import { Briefcase, User, Calendar, DollarSign, Clock, ShieldCheck } from 'lucide-react';

export default function EmployeeAssignment({ assignments = [], empUser }) {
  const myAssignments = assignments.filter(a => a.employee_id === empUser.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Contract Assignment Specifications</h2>
        <p className="text-sm text-slate-500">View contractual billing rates, assigned project manager, and weekly hour caps.</p>
      </div>

      <div className="space-y-4">
        {myAssignments.map(a => (
          <Card key={a.id} className="space-y-4">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-sky-600">Active Contract</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{a.project_name}</h3>
                <p className="text-sm font-semibold text-slate-600">{a.client_name}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border">
                <p className="text-xs font-semibold text-slate-500">Contract Role</p>
                <p className="font-bold text-slate-900 mt-1">{a.role}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border">
                <p className="text-xs font-semibold text-slate-500">Project Manager</p>
                <p className="font-bold text-slate-900 mt-1">{a.pm_name}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border">
                <p className="text-xs font-semibold text-slate-500">Contract Billing Rate</p>
                <p className="font-extrabold text-emerald-700 mt-1">${parseFloat(a.billing_rate).toFixed(2)} / hr</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border">
                <p className="text-xs font-semibold text-slate-500">Weekly Hour Cap</p>
                <p className="font-bold text-slate-900 mt-1">{a.weekly_hour_limit} hrs / week</p>
              </div>
            </div>

            <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 flex justify-between items-center">
              <span>Contract Duration: <strong>{a.start_date}</strong> to <strong>{a.end_date}</strong></span>
              <Badge variant="info">Active Contract</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
