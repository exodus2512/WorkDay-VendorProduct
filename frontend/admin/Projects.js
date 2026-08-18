'use client';
import React, { useState } from 'react';
import { Card, Button, Input, Select, Textarea, Modal, StatusBadge, Alert } from '../components/UI.js';
import { Plus, Check, X, UserPlus, TrendingUp, TrendingDown, Minus, Users, AlertTriangle } from 'lucide-react';

// Compute a health score for a project based on milestones & assignments
function getProjectHealth(project, milestones, assignments) {
  const pMilestones = milestones.filter(m => m.project_id === project.id);
  const pAssignments = assignments.filter(a => a.project_id === project.id);

  if (project.status !== 'ACTIVE') return { label: 'N/A', color: 'text-slate-400', icon: Minus, bg: 'bg-slate-100' };

  if (pMilestones.length === 0 && pAssignments.length === 0) {
    return { label: 'Just Started', color: 'text-slate-500', icon: Minus, bg: 'bg-slate-100' };
  }

  let score = 0;
  // Positive signals
  if (pAssignments.filter(a => a.status === 'ACTIVE').length > 0) score += 30;
  if (project.project_manager_id) score += 20;
  const approvedMs = pMilestones.filter(m => m.status === 'APPROVED' || m.status === 'COMPLETED').length;
  const rejectedMs = pMilestones.filter(m => m.status === 'REJECTED').length;
  const pendingMs = pMilestones.filter(m => m.status === 'PENDING').length;
  if (pMilestones.length > 0) score += (approvedMs / pMilestones.length) * 30;
  // Negative signals
  score -= rejectedMs * 10;
  score -= pendingMs * 3;
  // Overdue check
  const today = new Date();
  const end = new Date(project.end_date);
  if (end < today) score -= 25;

  if (score >= 55) return { label: 'On Track',    color: 'text-emerald-700', icon: TrendingUp,   bg: 'bg-emerald-100' };
  if (score >= 30) return { label: 'Needs Review',color: 'text-amber-700',   icon: Minus,         bg: 'bg-amber-100'   };
  return             { label: 'At Risk',        color: 'text-red-700',     icon: TrendingDown,  bg: 'bg-red-100'     };
}

export default function AdminProjects({ projects = [], pms = [], milestones = [], assignments = [], onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '', client_name: '', description: '', budget: '',
    start_date: new Date().toISOString().split('T')[0], end_date: '', project_manager_id: ''
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) { setIsModalOpen(false); if (onRefresh) onRefresh(); }
  };

  const handleStatusChange = async (projectId, action) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (res.ok && onRefresh) onRefresh();
  };

  const activeProjects   = projects.filter(p => p.status === 'ACTIVE');
  const pendingProjects  = projects.filter(p => p.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Project Portfolio</h2>
          <p className="text-sm text-slate-500">Track project health, workforce allocation, and delivery status.</p>
        </div>
        <Button variant="primary" onClick={() => { setFormData({ name: '', client_name: '', description: '', budget: '', start_date: new Date().toISOString().split('T')[0], end_date: '', project_manager_id: pms[0]?.id || '' }); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: projects.length, color: 'text-slate-700', bg: 'bg-white' },
          { label: 'Active',         value: activeProjects.length,  color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Pending Review', value: pendingProjects.length, color: 'text-amber-700',   bg: 'bg-amber-50'   },
          { label: 'Total Budget',   value: `$${projects.reduce((s, p) => s + parseFloat(p.budget || 0), 0).toLocaleString()}`, color: 'text-blue-700', bg: 'bg-blue-50' }
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border border-slate-200 rounded-2xl p-4`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pending Approval Banner */}
      {pendingProjects.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">{pendingProjects.length} project{pendingProjects.length > 1 ? 's' : ''} awaiting your approval</p>
            <p className="text-xs text-amber-600 mt-0.5">Review and accept or reject each proposal below.</p>
          </div>
        </div>
      )}

      {/* Project Cards */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card><p className="text-center text-slate-400 py-10">No projects yet. Create one to get started.</p></Card>
        ) : (
          projects.map(project => {
            const health = getProjectHealth(project, milestones, assignments);
            const HealthIcon = health.icon;
            const pAssignments = assignments.filter(a => a.project_id === project.id && a.status === 'ACTIVE');
            const pMilestones  = milestones.filter(m => m.project_id === project.id);
            const approvedMs   = pMilestones.filter(m => m.status === 'APPROVED' || m.status === 'COMPLETED').length;

            return (
              <div key={project.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="p-6">
                  {/* Title Row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{project.name}</h3>
                        <StatusBadge status={project.status} />
                        {project.status === 'ACTIVE' && (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${health.bg} ${health.color}`}>
                            <HealthIcon className="w-3.5 h-3.5" />
                            {health.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{project.client_name} · ${parseFloat(project.budget || 0).toLocaleString()} · {project.start_date} → {project.end_date}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {project.status === 'PENDING' && (
                        <>
                          <Button variant="success" size="sm" onClick={() => handleStatusChange(project.id, 'ACCEPT')}>
                            <Check className="w-3.5 h-3.5" /> Accept
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleStatusChange(project.id, 'REJECT')}>
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Three-column info strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Project Manager */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {project.pm_name ? project.pm_name[0] : '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 font-medium">Project Manager</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{project.pm_name || 'Unassigned'}</p>
                      </div>
                    </div>

                    {/* Workforce */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Workforce Assigned</p>
                        <p className="text-sm font-bold text-slate-800">{pAssignments.length} active contractor{pAssignments.length !== 1 ? 's' : ''}</p>
                        {pAssignments.length > 0 && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {pAssignments.slice(0, 2).map(a => a.employee_name).join(', ')}
                            {pAssignments.length > 2 ? ` +${pAssignments.length - 2} more` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Milestones Progress */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 font-medium">Milestones</p>
                        <p className="text-sm font-bold text-slate-800">{approvedMs} / {pMilestones.length} completed</p>
                        {pMilestones.length > 0 && (
                          <div className="mt-1.5 w-full h-1.5 rounded-full bg-slate-200">
                            <div
                              className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                              style={{ width: `${pMilestones.length > 0 ? (approvedMs / pMilestones.length) * 100 : 0}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Project Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Mobile Banking App" />
            <Input label="Client Name" required value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="e.g. Apex Corp" />
          </div>
          <Textarea label="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Budget (USD)" type="number" required value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} />
            <Select label="Assign PM" value={formData.project_manager_id} onChange={e => setFormData({ ...formData, project_manager_id: e.target.value })}
              options={[{ value: '', label: 'Unassigned' }, ...pms.map(pm => ({ value: pm.id, label: pm.name }))]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            <Input label="End Date" type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
