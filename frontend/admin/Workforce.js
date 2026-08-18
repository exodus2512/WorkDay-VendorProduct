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
  Badge
} from '../components/UI.js';
import { UserPlus, Edit3, ShieldAlert, Zap, Activity, Target } from 'lucide-react';

// ── Skill Tag Input Component ──────────────────────────────────────────────
function SkillTagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const skills = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const addSkill = (raw) => {
    const skill = raw.trim();
    if (!skill || skills.includes(skill)) return;
    const next = [...skills, skill].join(', ');
    onChange(next);
    setInput('');
  };

  const removeSkill = (skill) => {
    const next = skills.filter(s => s !== skill).join(', ');
    onChange(next);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    } else if (e.key === 'Backspace' && !input && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        Skills <span className="font-normal text-slate-400">(Press Enter or comma to add)</span>
      </label>
      <div className="flex flex-wrap gap-1.5 p-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold border border-sky-200"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="ml-0.5 text-sky-400 hover:text-rose-500 transition-colors font-bold leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input.trim()) addSkill(input); }}
          placeholder={skills.length === 0 ? (placeholder || 'Add skills...') : ''}
          className="flex-1 min-w-[120px] outline-none text-sm text-slate-700 bg-transparent placeholder-slate-400"
        />
      </div>
    </div>
  );
}

// ── Bandwidth / Utilisation Bar ──────────────────────────────────────────────
function UtilizationBar({ allocated, capacity }) {
  const pct = capacity > 0 ? Math.min(Math.round((allocated / capacity) * 100), 100) : 0;
  const color =
    pct >= 90 ? 'bg-rose-500' :
    pct >= 70 ? 'bg-amber-500' :
    'bg-emerald-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{allocated}/{capacity} hrs</span>
        <span className={`font-semibold ${pct >= 90 ? 'text-rose-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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
    weekly_capacity_hours: 40,
    status: 'ACTIVE',
    payout_currency: 'USD',
    tax_region: 'US-DEFAULT',
    tax_exempt: false
  });

  const handleOpenAdd = () => {
    setEditingContractor(null);
    setFormData({ name: '', email: '', role: 'EMPLOYEE', skills: '', availability: 'FULL_TIME', weekly_capacity_hours: 40, status: 'ACTIVE', payout_currency: 'USD', tax_region: 'US-DEFAULT', tax_exempt: false });
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
      weekly_capacity_hours: c.weekly_capacity_hours || 40,
      status: c.status || 'ACTIVE',
      payout_currency: c.payout_currency || 'USD',
      tax_region: c.tax_region || 'US-DEFAULT',
      tax_exempt: !!c.tax_exempt
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

  // Compute utilization per contractor from active assignments
  const utilizationMap = {};
  for (const a of assignments) {
    if (a.status === 'ACTIVE') {
      utilizationMap[a.employee_id] = (utilizationMap[a.employee_id] || 0) + (parseInt(a.weekly_hour_limit, 10) || 0);
    }
  }

  const bench = contractors.filter(c => !utilizationMap[c.id]);
  const active = contractors.filter(c => utilizationMap[c.id]);
  const overloaded = contractors.filter(c => utilizationMap[c.id] >= (c.weekly_capacity_hours || 40));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Workforce & Talent Pool</h2>
          <p className="text-sm text-slate-500">Track skill profiles, weekly bandwidth, and real-time deployment status.</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <UserPlus className="w-4 h-4" /> Add New Contractor
        </Button>
      </div>

      {/* ── Summary Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Contractors', value: contractors.length, color: 'bg-sky-50 text-sky-700 border-sky-200', icon: '👥' },
          { label: 'On Bench (Available)', value: bench.length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🟢' },
          { label: 'Actively Deployed', value: active.length, color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '⚡' },
          { label: 'At/Over Capacity', value: overloaded.length, color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '🔴' }
        ].map(m => (
          <div key={m.label} className={`rounded-xl border p-4 ${m.color}`}>
            <div className="text-2xl mb-1">{m.icon}</div>
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-80">{m.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <Table headers={['Contractor', 'Skills Profile', 'Weekly Capacity', 'Bandwidth Utilization', 'Current Deployment', 'Status', 'Actions']}>
          {contractors.map(c => {
            const allocatedHrs = utilizationMap[c.id] || 0;
            const capacity = parseInt(c.weekly_capacity_hours || 40, 10);
            const currentAssignments = assignments.filter(a => a.employee_id === c.id && a.status === 'ACTIVE');
            const isOverCapacity = allocatedHrs >= capacity;

            return (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{c.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {c.skills ? (
                      c.skills.split(',').slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="info" size="sm">{skill.trim()}</Badge>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs italic">No skills listed</span>
                    )}
                    {c.skills && c.skills.split(',').length > 3 && (
                      <Badge variant="default" size="sm">+{c.skills.split(',').length - 3}</Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Target className="w-3.5 h-3.5 text-sky-500" />
                    {capacity} hrs/wk
                  </div>
                </td>
                <td className="px-6 py-4 min-w-[150px]">
                  {c.availability === 'UNAVAILABLE' ? (
                    <Badge variant="danger">Unavailable</Badge>
                  ) : (
                    <UtilizationBar allocated={allocatedHrs} capacity={capacity} />
                  )}
                  {isOverCapacity && c.availability !== 'UNAVAILABLE' && (
                    <div className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Over capacity!
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-xs">
                  {currentAssignments.length > 0 ? (
                    <div className="space-y-1">
                      {currentAssignments.slice(0, 2).map((a, i) => (
                        <div key={i}>
                          <p className="font-bold text-sky-700">{a.project_name}</p>
                          <p className="text-slate-500">{a.role} · {a.weekly_hour_limit}h/wk</p>
                        </div>
                      ))}
                      {currentAssignments.length > 2 && (
                        <p className="text-slate-400">+{currentAssignments.length - 2} more</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <Activity className="w-3 h-3" /> On bench
                    </span>
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

          <SkillTagInput
            value={formData.skills}
            onChange={(val) => setFormData({ ...formData, skills: val })}
            placeholder="e.g. React, Node.js, PostgreSQL, AWS"
          />

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
              onChange={e => {
                const hrs = e.target.value === 'PART_TIME' ? 20 : e.target.value === 'UNAVAILABLE' ? 0 : 40;
                setFormData({ ...formData, availability: e.target.value, weekly_capacity_hours: hrs });
              }}
              options={[
                { value: 'FULL_TIME', label: 'Full-Time' },
                { value: 'PART_TIME', label: 'Part-Time' },
                { value: 'UNAVAILABLE', label: 'Unavailable' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payout Currency"
              value={formData.payout_currency}
              onChange={e => setFormData({ ...formData, payout_currency: e.target.value })}
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
                { value: 'INR', label: 'INR (₹)' },
                { value: 'AUD', label: 'AUD (A$)' },
                { value: 'CAD', label: 'CAD (C$)' },
                { value: 'SGD', label: 'SGD (S$)' },
                { value: 'JPY', label: 'JPY (¥)' }
              ]}
            />
            <Select
              label="Tax Region"
              value={formData.tax_region}
              onChange={e => setFormData({ ...formData, tax_region: e.target.value })}
              options={[
                { value: 'US-DEFAULT', label: 'US (0%)' },
                { value: 'US-TX', label: 'Texas (6.25%)' },
                { value: 'US-CA', label: 'California (7.25%)' },
                { value: 'IN-GST', label: 'India GST (18%)' },
                { value: 'UK-VAT', label: 'UK VAT (20%)' },
                { value: 'EU-VAT', label: 'EU VAT (21%)' },
                { value: 'SG-GST', label: 'Singapore GST (9%)' },
                { value: 'AU-GST', label: 'Australia GST (10%)' }
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="taxExemptCheckbox"
              checked={formData.tax_exempt}
              onChange={e => setFormData({ ...formData, tax_exempt: e.target.checked })}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
            <label htmlFor="taxExemptCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
              B2B Contractor (Self-Managed Tax - 0%)
            </label>
          </div>

          <div>
            <Input
              label="Max Weekly Capacity (hrs)"
              type="number"
              min="0"
              max="80"
              value={formData.weekly_capacity_hours}
              onChange={e => setFormData({ ...formData, weekly_capacity_hours: parseInt(e.target.value, 10) || 0 })}
              placeholder="40"
            />
            <p className="text-xs text-slate-400 mt-1">
              This defines their total bandwidth. The Smart Matcher uses this to calculate available hours.
            </p>
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
