'use client';
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Modal,
  StatusBadge,
  Alert
} from '../components/UI.js';
import { CheckSquare, Upload, ExternalLink, Send } from 'lucide-react';

export default function EmployeeMilestones({ milestones = [], empUser, onRefresh }) {
  const [submitModal, setSubmitModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const handleOpenSubmit = (m) => {
    setSelectedMilestone(m);
    setEvidenceUrl(m.evidence || '');
    setSubmitModal(true);
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!selectedMilestone) return;

    try {
      await fetch(`/api/milestones/${selectedMilestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT',
          submitted_by: empUser.id,
          evidence: evidenceUrl
        })
      });
      setSubmitModal(false);
      setEvidenceUrl('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to submit milestone:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Project Deliverables & Milestones</h2>
        <p className="text-sm text-slate-500">Track assigned milestone deliverables and upload completion evidence for PM sign-off.</p>
      </div>

      <Card>
        <Table headers={['Milestone Name', 'Project', 'Due Date', 'Milestone Value', 'Status', 'Evidence', 'Action']}>
          {milestones.map(m => (
            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
              <td className="px-6 py-4 font-semibold text-slate-700">{m.project_name}</td>
              <td className="px-6 py-4 text-xs text-slate-500">{m.due_date}</td>
              <td className="px-6 py-4 font-bold text-emerald-700">${parseFloat(m.amount).toLocaleString()}</td>
              <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
              <td className="px-6 py-4 text-xs">
                {m.evidence ? (
                  <span className="text-sky-700 font-semibold truncate max-w-[120px] block">{m.evidence}</span>
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </td>
              <td className="px-6 py-4">
                {(m.status === 'PENDING' || m.status === 'IN_PROGRESS' || m.status === 'REJECTED') && (
                  <Button variant="primary" size="sm" onClick={() => handleOpenSubmit(m)}>
                    <Upload className="w-3.5 h-3.5" /> Submit Evidence
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Submit Evidence Modal */}
      {selectedMilestone && (
        <Modal isOpen={submitModal} onClose={() => setSubmitModal(false)} title={`Submit Evidence - ${selectedMilestone.name}`}>
          <form onSubmit={handleSubmitCompletion} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border">
              <p className="font-bold text-slate-900">{selectedMilestone.name}</p>
              <p className="text-slate-600">{selectedMilestone.description}</p>
              <p className="text-emerald-700 font-bold">Value: ${parseFloat(selectedMilestone.amount).toLocaleString()}</p>
            </div>

            {selectedMilestone.rejection_reason && (
              <Alert type="danger" title="Previous Feedback">
                {selectedMilestone.rejection_reason}
              </Alert>
            )}

            <Input
              label="Work Evidence URL or Pull Request Link"
              required
              value={evidenceUrl}
              onChange={e => setEvidenceUrl(e.target.value)}
              placeholder="https://github.com/vendorcorp/repo/pull/42 or doc link"
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setSubmitModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">
                <Send className="w-4 h-4" /> Submit for PM Approval
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
