'use client';
import React from 'react';
import { Card, Table, StatusBadge, Badge } from '../components/UI.js';
import { Briefcase, Calendar, DollarSign, Users } from 'lucide-react';

export default function PMProjects({ projects = [], pmUser, assignments = [], milestones = [] }) {
  const myProjects = projects.filter(p => p.project_manager_id === pmUser.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Assigned Project Scope & Progress</h2>
        <p className="text-sm text-slate-500">Track milestones, team composition, and project deadlines under your management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myProjects.map(p => {
          const pAss = assignments.filter(a => a.project_id === p.id);
          const pMs = milestones.filter(m => m.project_id === p.id);
          const completedMs = pMs.filter(m => m.status === 'COMPLETED' || m.status === 'APPROVED');
          const progressPct = pMs.length > 0 ? Math.round((completedMs.length / pMs.length) * 100) : 0;

          return (
            <Card key={p.id} className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">{p.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">{p.client_name}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Milestone Completion</span>
                  <span>{progressPct}% ({completedMs.length}/{pMs.length})</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Budget</p>
                  <p className="font-bold text-slate-900 mt-0.5">${parseFloat(p.budget).toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Contractors</p>
                  <p className="font-bold text-slate-900 mt-0.5">{pAss.length} assigned</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border">
                  <p className="text-[10px] uppercase font-bold text-slate-400">End Date</p>
                  <p className="font-bold text-slate-900 mt-0.5">{p.end_date}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
