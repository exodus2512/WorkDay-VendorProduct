'use client';
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  StatusBadge,
  Modal,
  Alert,
  Badge
} from '../components/UI.js';
import { Calculator, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminBilling({ timesheets = [], milestones = [], projects = [], assignments = [], onNavigate, onRefresh }) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0] ? String(projects[0].id) : '');
  const [validationModal, setValidationModal] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [generating, setGenerating] = useState(false);

  const selectedProject = selectedProjectId ? projects.find(p => String(p.id) === String(selectedProjectId)) : (projects[0] || null);
  const activeProjectId = selectedProject ? String(selectedProject.id) : '';

  const approvedTimesheets = timesheets.filter(t => 
    t.status === 'APPROVED' && 
    activeProjectId &&
    (String(t.project_id) === activeProjectId || 
     assignments.some(a => String(a.id) === String(t.assignment_id) && String(a.project_id) === activeProjectId))
  );

  const approvedMilestones = milestones.filter(m => 
    (m.status === 'APPROVED' || m.status === 'COMPLETED') && 
    activeProjectId &&
    String(m.project_id) === activeProjectId
  );

  const timesheetTotal = approvedTimesheets.reduce((acc, t) => acc + (parseFloat(t.total_hours || 0) * parseFloat(t.billing_rate || 0)), 0);
  const milestoneTotal = approvedMilestones.reduce((acc, m) => acc + parseFloat(m.amount || 0), 0);
  const subtotal = timesheetTotal + milestoneTotal;
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const handleRunValidation = async () => {
    if (!selectedProject) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/invoices/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          timesheet_ids: approvedTimesheets.map(t => t.id),
          milestone_ids: approvedMilestones.map(m => m.id)
        })
      });
      const json = await res.json();
      setValidationData(json);
      setValidationModal(true);
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject?.id,
          timesheet_ids: approvedTimesheets.map(t => t.id),
          milestone_ids: approvedMilestones.map(m => m.id)
        })
      });
      if (res.ok) {
        setValidationModal(false);
        if (onRefresh) onRefresh();
        onNavigate('invoices');
      }
    } catch (err) {
      console.error('Failed to generate invoice:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Approved Billable Work & Validation</h2>
          <p className="text-sm text-slate-500">Consolidate PM-approved timesheets and milestones before invoice generation.</p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={e => {
              setSelectedProjectId(e.target.value);
              setValidationModal(false);
              setValidationData(null);
            }}
            className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 shadow-sm"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.client_name})</option>
            ))}
          </select>
          <Button variant="primary" onClick={handleRunValidation} loading={generating} disabled={approvedTimesheets.length === 0 && approvedMilestones.length === 0}>
            <Calculator className="w-4 h-4" /> Run Invoice Validation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Approved Timesheets</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{approvedTimesheets.length}</p>
          <p className="text-xs font-semibold text-emerald-600 mt-0.5">${timesheetTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Approved Milestones</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{approvedMilestones.length}</p>
          <p className="text-xs font-semibold text-emerald-600 mt-0.5">${milestoneTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Subtotal</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${subtotal.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Tax (18%): ${tax.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-sky-900 to-slate-900 p-5 rounded-xl text-white shadow-sm">
          <p className="text-xs uppercase font-semibold text-sky-200">Total Billable</p>
          <p className="text-2xl font-extrabold mt-1">${total.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 font-semibold mt-0.5">Ready for Client Invoice</p>
        </div>
      </div>

      {/* Approved Timesheets Section */}
      <Card title="Approved Billable Timesheets">
        {approvedTimesheets.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No approved timesheets for this project.</p>
        ) : (
          <Table headers={['Timesheet ID', 'Contractor', 'Week Start', 'Approved Hours', 'Rate', 'Billable Amount', 'Status']}>
            {approvedTimesheets.map(t => {
              const hrs = parseFloat(t.total_hours || 0);
              const rate = parseFloat(t.billing_rate || 0);
              const amt = hrs * rate;
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">TS #{t.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{t.employee_name}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{t.week_start}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{hrs} hrs</td>
                  <td className="px-6 py-4 text-slate-700">${rate}/hr</td>
                  <td className="px-6 py-4 font-bold text-emerald-700">${amt.toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Approved Milestones Section */}
      <Card title="Approved Billable Milestones">
        {approvedMilestones.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No approved milestones for this project.</p>
        ) : (
          <Table headers={['Milestone ID', 'Milestone Name', 'Due Date', 'Submitted By', 'Amount', 'Status']}>
            {approvedMilestones.map(m => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-900">MS #{m.id}</td>
                <td className="px-6 py-4 font-semibold text-slate-800">{m.name}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{m.due_date}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-700">{m.submitted_by_name || 'Contractor'}</td>
                <td className="px-6 py-4 font-bold text-emerald-700">${parseFloat(m.amount).toLocaleString()}</td>
                <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Section 11 Invoice Validation Modal */}
      {validationData && (
        <Modal isOpen={validationModal} onClose={() => setValidationModal(false)} title="Invoice Pre-Submission Validation Checklist" maxWidth="max-w-2xl">
          <div className="space-y-6">
            {/* Status Header (Requirement 11) */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${validationData.validation.isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <div className="flex items-center gap-3">
                {validationData.validation.isValid ? (
                  <ShieldCheck className="w-7 h-7 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-rose-600" />
                )}
                <div>
                  <h4 className="font-extrabold text-base tracking-wide">{validationData.validation.statusText}</h4>
                  <p className="text-xs mt-0.5">{validationData.validation.isValid ? 'All 7 mandatory billing audit checks PASSED successfully.' : 'Validation detected exceptions in billing parameters.'}</p>
                </div>
              </div>
              <Badge variant={validationData.validation.isValid ? 'success' : 'danger'} size="lg">
                {validationData.validation.isValid ? 'READY' : 'EXCEPTIONS'}
              </Badge>
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-800 text-sm border-b pb-2">Rule Check Matrix</h5>
              {Object.entries(validationData.validation.checks).map(([key, check]) => (
                <div key={key} className="flex items-start justify-between p-3 rounded-lg border bg-slate-50/50">
                  <div className="flex items-start gap-2.5">
                    {check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-sm text-slate-900">{check.label}</p>
                      <p className="text-xs text-slate-600">{check.details}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-extrabold ${check.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {check.passed ? '✓ PASSED' : '✕ FAILED'}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-sm">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal ({validationData.billables.items.length} items)</span>
                <span>${validationData.billables.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Configured Tax (18%)</span>
                <span>${validationData.billables.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base border-t border-slate-800 pt-2 text-sky-400">
                <span>Total Invoice Amount</span>
                <span>${validationData.billables.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setValidationModal(false)}>Close</Button>
              {validationData.validation.isValid && (
                <Button variant="success" onClick={handleGenerateInvoice}>
                  Generate & Save Invoice
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
