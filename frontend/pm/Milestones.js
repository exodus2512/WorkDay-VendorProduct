'use client';
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  StatusBadge,
  Modal,
  Textarea,
  Alert
} from '../components/UI.js';
import { CheckSquare, CheckCircle, XCircle, ExternalLink, FileText } from 'lucide-react';

export default function PMMilestones({ milestones = [], projects = [], onRefresh }) {
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [targetMsId, setTargetMsId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (msId) => {
    try {
      await fetch(`/api/milestones/${msId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to approve milestone:', err);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!targetMsId) return;
    try {
      await fetch(`/api/milestones/${targetMsId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason })
      });
      setRejectModal(false);
      setRejectionReason('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to reject milestone:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Milestone Approvals & Deliverable Sign-off</h2>
        <p className="text-sm text-slate-500">Review submitted work evidence, code PRs, and audit artifacts before releasing billables.</p>
      </div>

      <Card>
        <Table headers={['Milestone Name', 'Project', 'Due Date', 'Milestone Value', 'Submitted By', 'Status', 'Actions']}>
          {milestones.map(m => (
            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
              <td className="px-6 py-4 font-semibold text-slate-700">{m.project_name}</td>
              <td className="px-6 py-4 text-xs text-slate-500">{m.due_date}</td>
              <td className="px-6 py-4 font-bold text-emerald-700">${parseFloat(m.amount).toLocaleString()}</td>
              <td className="px-6 py-4 text-xs font-semibold text-slate-700">{m.submitted_by_name || 'Unassigned'}</td>
              <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
              <td className="px-6 py-4 space-x-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedMilestone(m)}>
                  <FileText className="w-3.5 h-3.5" /> Evidence
                </Button>
                {m.status === 'SUBMITTED' && (
                  <>
                    <Button variant="success" size="sm" onClick={() => handleApprove(m.id)}>
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => { setTargetMsId(m.id); setRejectModal(true); }}>
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* View Evidence Modal */}
      {selectedMilestone && (
        <Modal isOpen={!!selectedMilestone} onClose={() => setSelectedMilestone(null)} title={`Milestone Evidence - ${selectedMilestone.name}`}>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-900">{selectedMilestone.name}</span>
                <StatusBadge status={selectedMilestone.status} />
              </div>
              <p className="text-xs text-slate-600">{selectedMilestone.description}</p>
              <p className="text-xs font-bold text-emerald-700">Value: ${parseFloat(selectedMilestone.amount).toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Submitted Work Evidence:</h5>
              {selectedMilestone.evidence ? (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 font-medium break-all flex items-center justify-between">
                  <span>{selectedMilestone.evidence}</span>
                  {selectedMilestone.evidence.startsWith('http') && (
                    <a href={selectedMilestone.evidence} target="_blank" rel="noreferrer" className="p-1 text-sky-700 hover:text-sky-900">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No completion evidence uploaded yet.</p>
              )}
            </div>

            {selectedMilestone.rejection_reason && (
              <Alert type="danger" title="Previous Rejection Feedback">
                {selectedMilestone.rejection_reason}
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedMilestone(null)}>Close</Button>
              {selectedMilestone.status === 'SUBMITTED' && (
                <Button variant="success" onClick={() => { handleApprove(selectedMilestone.id); setSelectedMilestone(null); }}>
                  Approve Deliverable
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Reason Modal */}
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Milestone Deliverable">
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <Textarea
            label="Rejection Reason & Required Feedback"
            required
            rows={4}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="e.g. Missing E2E test suite report or incomplete API documentation."
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button variant="danger" type="submit">Reject Deliverable</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
