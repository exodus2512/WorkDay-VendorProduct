'use client';
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  StatusBadge,
  Alert
} from '../components/UI.js';
import { Plus, Check, X, UserPlus, Briefcase, Calendar, DollarSign } from 'lucide-react';

export default function AdminProjects({ projects = [], pms = [], milestones = [], onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    description: '',
    budget: '',
    start_date: '',
    end_date: '',
    project_manager_id: ''
  });

  const [assignPmModal, setAssignPmModal] = useState(false);
  const [pmTargetProject, setPmTargetProject] = useState(null);
  const [selectedPmId, setSelectedPmId] = useState('');

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      client_name: '',
      description: '',
      budget: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      project_manager_id: pms.length > 0 ? pms[0].id : ''
    });
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleStatusChange = async (projectId, action) => {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(`Failed to ${action} project:`, err);
    }
  };

  const handleAssignPmSubmit = async (e) => {
    e.preventDefault();
    if (!pmTargetProject || !selectedPmId) return;
    try {
      await fetch(`/api/projects/${pmTargetProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ASSIGN_PM', project_manager_id: parseInt(selectedPmId, 10) })
      });
      setAssignPmModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to assign PM:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Client Projects & Scope Management</h2>
          <p className="text-sm text-slate-500">Review project proposals, assign project managers, and manage budgets.</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4" /> Receive New Project Proposal
        </Button>
      </div>

      <Card>
        <Table headers={['Project Name', 'Client', 'Budget', 'Duration', 'Project Manager', 'Status', 'Actions']}>
          {projects.map(p => {
            const projectMs = milestones.filter(m => m.project_id === p.id);
            return (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500 truncate max-w-xs">{p.description}</div>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-700">{p.client_name}</td>
                <td className="px-6 py-4 font-bold text-emerald-700">${parseFloat(p.budget).toLocaleString()}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                  {p.start_date} to {p.end_date}
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-slate-800">{p.pm_name || 'Unassigned'}</span>
                  <button
                    onClick={() => { setPmTargetProject(p); setSelectedPmId(p.project_manager_id || ''); setAssignPmModal(true); }}
                    className="ml-2 text-xs font-semibold text-sky-600 hover:text-sky-800 underline"
                  >
                    {p.project_manager_id ? 'Reassign' : 'Assign PM'}
                  </button>
                </td>
                <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                <td className="px-6 py-4 space-x-2">
                  {p.status === 'PENDING' && (
                    <>
                      <Button variant="success" size="sm" onClick={() => handleStatusChange(p.id, 'ACCEPT')}>
                        <Check className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleStatusChange(p.id, 'REJECT')}>
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {p.status === 'ACTIVE' && (
                    <Button variant="outline" size="sm" onClick={() => setSelectedProject(p)}>
                      View Milestones ({projectMs.length})
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {/* Modal to Create Project */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Receive New Client Project">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input label="Project Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Mobile Banking App Overhaul" />
          <Input label="Client Name" required value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="e.g. Apex Financial Corp" />
          <Textarea label="Project Description & Scope" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Budget ($ USD)" type="number" step="0.01" required value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} placeholder="150000" />
            <Select
              label="Assign Project Manager"
              value={formData.project_manager_id}
              onChange={e => setFormData({ ...formData, project_manager_id: e.target.value })}
              options={[{ value: '', label: 'Unassigned' }, ...pms.map(pm => ({ value: pm.id, label: pm.name }))]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            <Input label="End Date" type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Submit Project Proposal</Button>
          </div>
        </form>
      </Modal>

      {/* Assign PM Modal */}
      <Modal isOpen={assignPmModal} onClose={() => setAssignPmModal(false)} title={`Assign PM to ${pmTargetProject?.name}`}>
        <form onSubmit={handleAssignPmSubmit} className="space-y-4">
          <Select
            label="Select Project Manager"
            value={selectedPmId}
            onChange={e => setSelectedPmId(e.target.value)}
            options={pms.map(pm => ({ value: pm.id, label: `${pm.name} (${pm.email})` }))}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setAssignPmModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save PM Assignment</Button>
          </div>
        </form>
      </Modal>

      {/* View Milestones Modal */}
      {selectedProject && (
        <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={`Milestones - ${selectedProject.name}`} maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="p-4 bg-sky-50 rounded-xl flex items-center justify-between text-sm">
              <div>
                <p className="font-bold text-slate-900">Total Budget: ${parseFloat(selectedProject.budget).toLocaleString()}</p>
                <p className="text-slate-600 text-xs">Client: {selectedProject.client_name}</p>
              </div>
              <StatusBadge status={selectedProject.status} />
            </div>

            <div className="space-y-3">
              {milestones.filter(m => m.project_id === selectedProject.id).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No milestones created yet.</p>
              ) : (
                milestones.filter(m => m.project_id === selectedProject.id).map(m => (
                  <div key={m.id} className="p-4 border rounded-xl bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-xs text-slate-600">{m.description}</p>
                    <div className="flex items-center justify-between text-xs pt-2 border-t font-semibold">
                      <span className="text-emerald-700">${parseFloat(m.amount).toLocaleString()}</span>
                      <span className="text-slate-500">Due: {m.due_date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedProject(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
