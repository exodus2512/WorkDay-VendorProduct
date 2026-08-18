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
  Badge
} from '../components/UI.js';
import { UserPlus, Edit3, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function AdminWorkforce({ users = [], assignments = [], onRefresh }) {
  const contractors = users.filter(u => u.role === 'EMPLOYEE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'EMPLOYEE',
    skills: '',
    availability: 'FULL_TIME',
    status: 'ACTIVE'
  });

  const handleOpenAdd = () => {
    setEditingContractor(null);
    setFormData({
      name: '',
      email: '',
      role: 'EMPLOYEE',
      skills: '',
      availability: 'FULL_TIME',
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingContractor(c);
    setFormData({
      name: c.name,
      email: c.email,
      role: c.role || 'EMPLOYEE',
      skills: c.skills || '',
      availability: c.availability || 'FULL_TIME',
      status: c.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContractor) {
        await fetch(`/api/employees/${editingContractor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, password: 'password123' })
        });
      }
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save contractor:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Workforce & Talent Pool</h2>
          <p className="text-sm text-slate-500">Track contingent contractors, skill profiles, work availability, and deployment status.</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <UserPlus className="w-4 h-4" /> Add New Contractor
        </Button>
      </div>

      <Card>
        <Table headers={['Contractor Name', 'Email / Contact', 'Skills Profile', 'Availability', 'Active Assignment', 'Status', 'Actions']}>
          {contractors.map(c => {
            const currentAssignment = assignments.find(a => a.employee_id === c.id && a.status === 'ACTIVE');
            return (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">{c.email}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {c.skills ? (
                      c.skills.split(',').map((skill, i) => (
                        <Badge key={i} variant="info" size="sm">
                          {skill.trim()}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs italic">No skills listed</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={c.availability === 'UNAVAILABLE' ? 'danger' : c.availability === 'PART_TIME' ? 'warning' : 'success'}>
                    {c.availability.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-xs">
                  {currentAssignment ? (
                    <div>
                      <p className="font-bold text-sky-700">{currentAssignment.project_name}</p>
                      <p className="text-slate-500">{currentAssignment.role} (${currentAssignment.billing_rate}/hr)</p>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-medium">Unassigned / Bench</span>
                  )}
                </td>
                <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                <td className="px-6 py-4">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(c)}>
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </Button>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {/* Modal to Add/Edit Contractor */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingContractor ? `Edit ${editingContractor.name}` : 'Add New Contractor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Jordan Lee" />
          <Input label="Email Address" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="jordan@contractor.io" />
          <Textarea label="Skills (Comma-separated)" value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} placeholder="React, Node.js, PostgreSQL, AWS" />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Persona Role / User Type"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: 'EMPLOYEE', label: 'Employee / Contractor' },
                { value: 'PROJECT_MANAGER', label: 'Project Manager' },
                { value: 'VENDOR_ADMIN', label: 'Vendor Admin' }
              ]}
            />
            <Select
              label="Availability"
              value={formData.availability}
              onChange={e => setFormData({ ...formData, availability: e.target.value })}
              options={[
                { value: 'FULL_TIME', label: 'Full-Time (40 hrs/wk)' },
                { value: 'PART_TIME', label: 'Part-Time (20 hrs/wk)' },
                { value: 'UNAVAILABLE', label: 'Unavailable' }
              ]}
            />
          </div>

          {formData.availability === 'UNAVAILABLE' && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Marking a contractor as UNAVAILABLE will prevent new project assignments.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingContractor ? 'Save Changes' : 'Add Contractor'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
