'use client';
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  StatusBadge,
  Modal,
  Textarea,
  Alert,
  Badge
} from '../components/UI.js';
import { Clock, CheckCircle, XCircle, Eye, AlertTriangle } from 'lucide-react';

export default function PMTimesheets({ timesheets = [], assignments = [], onRefresh }) {
  const [selectedTs, setSelectedTs] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [targetTsId, setTargetTsId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (tsId) => {
    try {
      await fetch(`/api/timesheets/${tsId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to approve timesheet:', err);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!targetTsId) return;
    try {
      await fetch(`/api/timesheets/${targetTsId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason })
      });
      setRejectModal(false);
      setRejectionReason('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to reject timesheet:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Contractor Timesheet Approvals</h2>
        <p className="text-sm text-slate-500">Verify submitted weekly work logs, check daily entries against weekly limits, approve or request revisions.</p>
      </div>

      <Card>
        <Table headers={['TS ID', 'Contractor', 'Project & Milestone', 'Week Start', 'Total Hours', 'Weekly Cap', 'Status', 'Actions']}>
          {timesheets.map(t => {
            const ass = assignments.find(a => a.id === t.assignment_id);
            const limit = ass ? parseInt(ass.weekly_hour_limit, 10) : 40;
            const isOverLimit = parseFloat(t.total_hours) > limit;

            return (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-extrabold text-slate-900">TS #{t.id}</td>
                <td className="px-6 py-4 font-bold text-slate-900">{t.employee_name}</td>
                <td className="px-6 py-4 font-semibold text-slate-700">
                  {t.project_name}
                  <div className="text-xs text-slate-500 font-normal mt-0.5">📌 {t.milestone_name || 'No Milestone'}</div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">{t.week_start}</td>
                <td className="px-6 py-4 font-extrabold text-sky-700">
                  {t.total_hours} hrs
                  {isOverLimit && <span className="ml-2 text-rose-600 text-xs font-bold">(Exceeds cap)</span>}
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-600">{limit} hrs</td>
                <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                <td className="px-6 py-4 space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTs(t)}>
                    <Eye className="w-3.5 h-3.5" /> Entries
                  </Button>
                  {t.status === 'SUBMITTED' && (
                    <>
                      <Button variant="success" size="sm" onClick={() => handleApprove(t.id)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => { setTargetTsId(t.id); setRejectionReason(isOverLimit ? `Hours (${t.total_hours} hrs) exceed the ${limit}-hour weekly limit.` : ''); setRejectModal(true); }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {/* Timesheet Details & Daily Entries Modal */}
      {selectedTs && (
        <Modal isOpen={!!selectedTs} onClose={() => setSelectedTs(null)} title={`Timesheet #${selectedTs.id} Details`}>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl space-y-1 text-sm border">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{selectedTs.employee_name}</span>
                <StatusBadge status={selectedTs.status} />
              </div>
              <p className="text-xs text-slate-600">Project: {selectedTs.project_name}</p>
              <p className="text-xs text-slate-600">Week Starting: {selectedTs.week_start}</p>
              <p className="text-xs font-semibold text-slate-700 mt-2">Work Description:</p>
              <p className="text-xs text-slate-600 italic bg-white p-2 rounded border">{selectedTs.work_description || 'No description'}</p>
            </div>

            {selectedTs.rejection_reason && (
              <Alert type="danger" title="Rejection Reason">
                {selectedTs.rejection_reason}
              </Alert>
            )}

            <h4 className="font-bold text-slate-800 text-sm">Daily Entry Breakdown</h4>
            <Table headers={['Date', 'Hours', 'Task Description']}>
              {selectedTs.entries && selectedTs.entries.length > 0 ? (
                selectedTs.entries.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">{e.date}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-sky-700">{e.hours} hrs</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{e.description}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs text-slate-500 text-center">No daily entries recorded.</td>
                </tr>
              )}
            </Table>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedTs(null)}>Close</Button>
              {selectedTs.status === 'SUBMITTED' && (
                <Button variant="success" onClick={() => { handleApprove(selectedTs.id); setSelectedTs(null); }}>
                  Approve Timesheet
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Reason Modal */}
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Timesheet & Request Revision">
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <Textarea
            label="Reason for Rejection"
            required
            rows={4}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="e.g. Hours exceed 40-hour limit without overtime authorization."
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button variant="danger" type="submit">Confirm Rejection</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
