'use client';
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea, StatusBadge, Alert } from '../components/UI.js';
import {
  Plus, Trash2, Send, FolderOpen, Calendar, DollarSign,
  Target, CheckCircle, Clock, Eye, LayoutDashboard
} from 'lucide-react';

export default function ClientPortal({ clientUser, onRefresh }) {
  const [activeTab, setActiveTab] = useState('submit');
  const [myProjects, setMyProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Project form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    budget: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  // Milestones form state (inline milestones as part of project submission)
  const [milestones, setMilestones] = useState([
    { name: '', description: '', amount: '', due_date: '' }
  ]);

  // Load client's projects
  const loadMyProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`/api/projects?client_user_id=${clientUser.id}`);
      const data = await res.json();
      // Filter by client_name matching the user's name
      const mine = Array.isArray(data) ? data.filter(p => p.client_name === clientUser.name) : [];
      setMyProjects(mine);
    } catch (err) {
      console.error('Failed to load client projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'projects') loadMyProjects();
  }, [activeTab]);

  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { name: '', description: '', amount: '', due_date: '' }]);
  };

  const removeMilestone = (index) => {
    if (milestones.length === 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    // Validate milestones total <= budget
    const totalMilestoneAmount = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
    const budget = parseFloat(form.budget) || 0;
    if (totalMilestoneAmount > budget) {
      setSubmitError(`Milestone total ($${totalMilestoneAmount.toLocaleString()}) exceeds project budget ($${budget.toLocaleString()}). Please adjust.`);
      return;
    }

    try {
      // 1. Create the project — use the client's name as client_name
      const projRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          client_name: clientUser.name,
          description: form.description,
          budget: form.budget,
          start_date: form.start_date,
          end_date: form.end_date,
          status: 'PENDING'
        })
      });

      if (!projRes.ok) {
        const err = await projRes.json();
        setSubmitError(err.error || 'Failed to submit project. Please try again.');
        return;
      }

      const newProject = await projRes.json();

      // 2. Create milestones for the project
      const validMilestones = milestones.filter(m => m.name && m.amount && m.due_date);
      for (const ms of validMilestones) {
        await fetch('/api/milestones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: newProject.id,
            name: ms.name,
            description: ms.description,
            amount: ms.amount,
            due_date: ms.due_date,
            status: 'PENDING'
          })
        });
      }

      setSubmitSuccess(true);
      setForm({ name: '', description: '', budget: '', start_date: new Date().toISOString().split('T')[0], end_date: '' });
      setMilestones([{ name: '', description: '', amount: '', due_date: '' }]);
      if (onRefresh) onRefresh();
    } catch (err) {
      setSubmitError('Network error. Please try again.');
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'ACTIVE':    return 'bg-emerald-100 text-emerald-700';
      case 'PENDING':   return 'bg-amber-100 text-amber-700';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700';
      case 'REJECTED':  return 'bg-red-100 text-red-700';
      default:          return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <FolderOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Client Project Portal</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Welcome, <span className="font-semibold text-blue-600">{clientUser.name}</span> — Submit new projects and track delivery progress.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 border-b border-slate-200 pb-0">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${activeTab === 'submit' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}
            >
              <Send className="w-4 h-4" /> Submit New Project
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${activeTab === 'projects' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> My Projects
            </button>
          </div>
        </div>

        {/* ── Tab: Submit New Project ── */}
        {activeTab === 'submit' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitSuccess && (
              <Alert type="success" title="Project Submitted Successfully! 🎉"
                message="Your project proposal has been received and is pending review by the Vendor Admin. You will be notified once it is approved and a Project Manager is assigned." />
            )}
            {submitError && (
              <Alert type="error" title="Submission Error" message={submitError} />
            )}

            {/* Project Details */}
            <Card title="📋 Project Details" subtitle="Describe the project you need completed">
              <div className="space-y-4">
                <Input
                  id="project-name"
                  label="Project Name *"
                  required
                  placeholder="e.g. E-Commerce Platform Redesign"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <Textarea
                  id="project-desc"
                  label="Project Description & Scope *"
                  required
                  placeholder="Describe the project goals, technical requirements, and expected deliverables in detail..."
                  rows={4}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    id="project-budget"
                    label="Total Budget (USD) *"
                    type="number"
                    step="1000"
                    min="0"
                    required
                    placeholder="150000"
                    value={form.budget}
                    onChange={e => setForm({ ...form, budget: e.target.value })}
                  />
                  <Input
                    id="project-start"
                    label="Start Date *"
                    type="date"
                    required
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                  />
                  <Input
                    id="project-end"
                    label="Deadline *"
                    type="date"
                    required
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
            </Card>

            {/* Milestones */}
            <Card
              title="🎯 Project Milestones"
              subtitle="Define delivery milestones and payment checkpoints"
              action={
                <Button variant="outline" size="sm" type="button" onClick={addMilestone}>
                  <Plus className="w-4 h-4" /> Add Milestone
                </Button>
              }
            >
              <div className="space-y-4">
                {milestones.map((ms, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
                        Milestone {i + 1}
                      </span>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(i)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Remove milestone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Milestone Name *"
                        placeholder="e.g. Phase 1: Design & Prototyping"
                        value={ms.name}
                        onChange={e => handleMilestoneChange(i, 'name', e.target.value)}
                      />
                      <Input
                        label="Payment Amount (USD) *"
                        type="number"
                        step="500"
                        min="0"
                        placeholder="25000"
                        value={ms.amount}
                        onChange={e => handleMilestoneChange(i, 'amount', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Textarea
                        label="Deliverables Description"
                        placeholder="What will be delivered at this milestone?"
                        rows={2}
                        value={ms.description}
                        onChange={e => handleMilestoneChange(i, 'description', e.target.value)}
                      />
                      <Input
                        label="Due Date *"
                        type="date"
                        value={ms.due_date}
                        onChange={e => handleMilestoneChange(i, 'due_date', e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                {/* Budget Allocation Summary */}
                {form.budget && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-sm">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      Milestone Total:
                      <span className="font-bold text-blue-700">
                        ${milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Budget: <span className="font-bold text-slate-800">${parseFloat(form.budget || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button variant="primary" type="submit" size="lg">
                <Send className="w-5 h-5" /> Submit Project Proposal
              </Button>
            </div>
          </form>
        )}

        {/* ── Tab: My Projects ── */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {loadingProjects ? (
              <Card>
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
                  Loading your projects...
                </div>
              </Card>
            ) : myProjects.length === 0 ? (
              <Card>
                <div className="text-center py-14">
                  <FolderOpen className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-1">No Projects Yet</h3>
                  <p className="text-sm text-slate-400 mb-6">Submit your first project proposal to get started.</p>
                  <Button variant="primary" onClick={() => setActiveTab('submit')}>
                    <Plus className="w-4 h-4" /> Submit a Project
                  </Button>
                </div>
              </Card>
            ) : (
              myProjects.map(project => (
                <ProjectCard key={project.id} project={project} statusColor={statusColor} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, statusColor }) {
  const [milestones, setMilestones] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && milestones.length === 0) {
      fetch(`/api/milestones?project_id=${project.id}`)
        .then(r => r.json())
        .then(data => setMilestones(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [expanded]);

  const approvedMs = milestones.filter(m => m.status === 'APPROVED' || m.status === 'COMPLETED').length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-slate-900 truncate">{project.name}</h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${statusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-base font-bold">${parseFloat(project.budget || 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Budget</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-bold">{project.end_date}</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Deadline</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-violet-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-base font-bold">{approvedMs}/{milestones.length || '—'}</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Milestones Done</p>
          </div>
        </div>

        {project.pm_name && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {project.pm_name[0]}
            </div>
            <span>PM: <span className="font-semibold text-slate-800">{project.pm_name}</span></span>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          {expanded ? 'Hide Milestones' : 'View Milestones'}
        </button>
      </div>

      {/* Milestones Expandable */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
          {milestones.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">No milestones defined yet.</p>
          ) : milestones.map(ms => (
            <div key={ms.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                {(ms.status === 'APPROVED' || ms.status === 'COMPLETED') ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : ms.status === 'IN_PROGRESS' ? (
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800">{ms.name}</p>
                  <p className="text-xs text-slate-400">Due: {ms.due_date}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-emerald-700">${parseFloat(ms.amount).toLocaleString()}</p>
                <StatusBadge status={ms.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
