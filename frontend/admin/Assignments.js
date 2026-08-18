'use client';
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Modal,
  StatusBadge,
  Alert
} from '../components/UI.js';
import { UserCheck, Plus, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function AdminAssignments({ assignments = [], projects = [], contractors = [], onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [formData, setFormData] = useState({
    project_id: '',
    employee_id: '',
    role: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    billing_rate: '',
    weekly_hour_limit: '40'
  });

  const handleOpenAdd = () => {
    setErrorMessage(null);
    setFormData({
      project_id: projects.length > 0 ? projects[0].id : '',
      employee_id: contractors.length > 0 ? contractors[0].id : '',
      role: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      billing_rate: '',
      weekly_hour_limit: '40'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Frontend validation for unavailable contractors
    const selectedContractor = contractors.find(c => c.id === parseInt(formData.employee_id, 10));
    if (selectedContractor && selectedContractor.availability === 'UNAVAILABLE') {
      setErrorMessage(`Cannot assign ${selectedContractor.name}. Contractor status is set to UNAVAILABLE.`);
      return;
    }

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error || 'Failed to create assignment');
        return;
      }
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Contractor Assignments & Rate Cards</h2>
          <p className="text-sm text-slate-500">Deploy contractors to active client projects, define billing rates, and weekly hour caps.</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <UserCheck className="w-4 h-4" /> New Assignment
        </Button>
      </div>

      <Card>
        <Table headers={['Contractor', 'Project Name', 'Assigned Role', 'Start Date', 'End Date', 'Billing Rate', 'Weekly Limit', 'Status']}>
          {assignments.map(a => (
            <tr key={a.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-bold text-slate-900">{a.employee_name}</td>
              <td className="px-6 py-4 font-semibold text-slate-700">{a.project_name}</td>
              <td className="px-6 py-4 text-xs font-semibold text-slate-600">{a.role}</td>
              <td className="px-6 py-4 text-xs text-slate-500">{a.start_date}</td>
              <td className="px-6 py-4 text-xs text-slate-500">{a.end_date}</td>
              <td className="px-6 py-4 font-bold text-emerald-700">${parseFloat(a.billing_rate).toFixed(2)}/hr</td>
              <td className="px-6 py-4 font-medium text-slate-600">{a.weekly_hour_limit} hrs</td>
              <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* New Assignment Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Contractor to Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <Alert type="danger" title="Assignment Prevented">
              {errorMessage}
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Select Project"
              value={formData.project_id}
              onChange={e => setFormData({ ...formData, project_id: e.target.value })}
              options={projects.map(p => ({ value: p.id, label: `${p.name} (${p.client_name})` }))}
            />
            <Select
              label="Select Contractor"
              value={formData.employee_id}
              onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
              options={contractors.map(c => ({
                value: c.id,
                label: `${c.name} - ${c.availability === 'UNAVAILABLE' ? '[UNAVAILABLE]' : c.availability}`
              }))}
            />
          </div>

          <Input label="Assigned Role" required value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="e.g. Senior Frontend Engineer" />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Billing Rate ($ USD/hr)" type="number" step="0.01" required value={formData.billing_rate} onChange={e => setFormData({ ...formData, billing_rate: e.target.value })} placeholder="85.00" />
            <Input label="Weekly Hour Limit" type="number" required value={formData.weekly_hour_limit} onChange={e => setFormData({ ...formData, weekly_hour_limit: e.target.value })} placeholder="40" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            <Input label="End Date" type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Assignment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
