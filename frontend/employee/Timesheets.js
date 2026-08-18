'use client';
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Textarea,
  Modal,
  StatusBadge,
  Alert
} from '../components/UI.js';
import { Plus, Edit, Send, Save, AlertTriangle, Eye } from 'lucide-react';

export default function EmployeeTimesheets({ timesheets = [], assignments = [], empUser, onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTs, setEditingTs] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignments.length > 0 ? assignments[0].id : '');
  const [weekStart, setWeekStart] = useState('2026-08-17');
  const [workDescription, setWorkDescription] = useState('');

  // 7 Daily Entries State (Mon - Sun)
  const [dailyEntries, setDailyEntries] = useState([
    { day: 'Mon', hours: '8', desc: 'Core feature development' },
    { day: 'Tue', hours: '8', desc: 'API route implementation' },
    { day: 'Wed', hours: '8', desc: 'UI component polish' },
    { day: 'Thu', hours: '8', desc: 'Integration testing' },
    { day: 'Fri', hours: '8', desc: 'Bug fixes and code review' },
    { day: 'Sat', hours: '0', desc: '' },
    { day: 'Sun', hours: '0', desc: '' },
  ]);

  const [viewDetailModal, setViewDetailModal] = useState(null);

  const calculateTotal = () => {
    return dailyEntries.reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);
  };

  const handleOpenNew = () => {
    setEditingTs(null);
    setWorkDescription('');
    setDailyEntries([
      { day: 'Mon', hours: '8', desc: 'Feature development' },
      { day: 'Tue', hours: '8', desc: 'Feature development' },
      { day: 'Wed', hours: '8', desc: 'Feature development' },
      { day: 'Thu', hours: '8', desc: 'Testing' },
      { day: 'Fri', hours: '8', desc: 'Code review' },
      { day: 'Sat', hours: '0', desc: '' },
      { day: 'Sun', hours: '0', desc: '' },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ts) => {
    setEditingTs(ts);
    setSelectedAssignmentId(ts.assignment_id);
    setWeekStart(ts.week_start);
    setWorkDescription(ts.work_description || '');
    if (ts.entries && ts.entries.length === 7) {
      setDailyEntries(ts.entries.map((e, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        hours: String(e.hours),
        desc: e.description || ''
      })));
    }
    setIsModalOpen(true);
  };

  const handleSubmitTimesheet = async (statusTarget) => {
    const totalHrs = calculateTotal();
    const formattedEntries = dailyEntries.map((e, i) => {
      const d = new Date(weekStart || '2026-08-17');
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().split('T')[0],
        hours: parseFloat(e.hours) || 0,
        description: e.desc
      };
    });

    try {
      if (editingTs) {
        await fetch(`/api/timesheets/${editingTs.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_hours: totalHrs,
            work_description: workDescription,
            status: statusTarget,
            entries: formattedEntries,
            rejection_reason: null
          })
        });
      } else {
        await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_id: parseInt(selectedAssignmentId, 10),
            employee_id: empUser.id,
            week_start: weekStart,
            total_hours: totalHrs,
            work_description: workDescription,
            status: statusTarget,
            entries: formattedEntries
          })
        });
      }

      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to submit timesheet:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Contractor Weekly Timesheet Logbook</h2>
          <p className="text-sm text-slate-500">Record daily work entries, edit draft logs, or resubmit rejected timesheets.</p>
        </div>
        <Button variant="primary" onClick={handleOpenNew}>
          <Plus className="w-4 h-4" /> Create New Weekly Log
        </Button>
      </div>

      <Card>
        <Table headers={['TS ID', 'Project', 'Week Start', 'Logged Hours', 'Status', 'Feedback / Rejection', 'Actions']}>
          {timesheets.map(t => (
            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-extrabold text-slate-900">TS #{t.id}</td>
              <td className="px-6 py-4 font-semibold text-slate-700">{t.project_name}</td>
              <td className="px-6 py-4 text-xs font-medium text-slate-600">{t.week_start}</td>
              <td className="px-6 py-4 font-bold text-sky-700">{t.total_hours} hrs</td>
              <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
              <td className="px-6 py-4 text-xs max-w-xs">
                {t.rejection_reason ? (
                  <span className="text-rose-700 font-medium">{t.rejection_reason}</span>
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </td>
              <td className="px-6 py-4 space-x-2">
                <Button variant="outline" size="sm" onClick={() => setViewDetailModal(t)}>
                  <Eye className="w-3.5 h-3.5" /> View
                </Button>
                {(t.status === 'DRAFT' || t.status === 'REJECTED') && (
                  <Button variant="primary" size="sm" onClick={() => handleOpenEdit(t)}>
                    <Edit className="w-3.5 h-3.5" /> Edit / Resubmit
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Timesheet Editor Modal (7 Daily Entry Form) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTs ? `Edit Timesheet #${editingTs.id}` : 'Create Weekly Timesheet'} maxWidth="max-w-3xl">
        <div className="space-y-6">
          {editingTs && editingTs.rejection_reason && (
            <Alert type="danger" title="PM Rejection Feedback">
              {editingTs.rejection_reason}
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Assignment</label>
              <select
                value={selectedAssignmentId}
                onChange={e => setSelectedAssignmentId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>{a.project_name} ({a.role})</option>
                ))}
              </select>
            </div>
            <Input label="Week Starting Date (Monday)" type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
          </div>

          <Textarea label="Weekly Accomplishments Summary" rows={2} value={workDescription} onChange={e => setWorkDescription(e.target.value)} placeholder="Summary of work completed this week..." />

          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-2">Daily Hours Entry (Mon - Sun)</h4>
            <div className="space-y-2">
              {dailyEntries.map((e, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border">
                  <span className="w-12 text-xs font-extrabold text-slate-700">{e.day}</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={e.hours}
                    onChange={ev => {
                      const newEntries = [...dailyEntries];
                      newEntries[idx].hours = ev.target.value;
                      setDailyEntries(newEntries);
                    }}
                    className="w-20 px-2 py-1 text-sm font-bold border rounded bg-white"
                  />
                  <input
                    type="text"
                    value={e.desc}
                    onChange={ev => {
                      const newEntries = [...dailyEntries];
                      newEntries[idx].desc = ev.target.value;
                      setDailyEntries(newEntries);
                    }}
                    placeholder="Work description for this day..."
                    className="flex-1 px-3 py-1 text-xs border rounded bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-300">Total Hours Logged</span>
            <span className="text-2xl font-extrabold text-sky-400">{calculateTotal()} hrs</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSubmitTimesheet('DRAFT')}>
              <Save className="w-4 h-4" /> Save Draft
            </Button>
            <Button variant="primary" onClick={() => handleSubmitTimesheet('SUBMITTED')}>
              <Send className="w-4 h-4" /> Submit to PM
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Detail Modal */}
      {viewDetailModal && (
        <Modal isOpen={!!viewDetailModal} onClose={() => setViewDetailModal(null)} title={`Timesheet #${viewDetailModal.id}`}>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl space-y-1 text-sm border">
              <div className="flex justify-between font-bold">
                <span>{viewDetailModal.project_name}</span>
                <StatusBadge status={viewDetailModal.status} />
              </div>
              <p className="text-xs text-slate-600">Week Start: {viewDetailModal.week_start}</p>
              <p className="text-xs font-bold text-sky-700">Total Hours: {viewDetailModal.total_hours} hrs</p>
            </div>

            <Table headers={['Date', 'Hours', 'Description']}>
              {viewDetailModal.entries && viewDetailModal.entries.length > 0 ? (
                viewDetailModal.entries.map((e, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2.5 text-xs font-semibold">{e.date}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-sky-700">{e.hours} hrs</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{e.description}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs text-slate-500 text-center">No entry details.</td>
                </tr>
              )}
            </Table>
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setViewDetailModal(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
