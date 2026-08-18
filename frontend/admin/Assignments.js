'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Modal,
  StatusBadge,
  Alert,
  Badge
} from '../components/UI.js';
import {
  UserCheck, Zap, Star, AlertTriangle, CheckCircle2,
  Target, Loader2, ShieldAlert, Users, Send, X, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Skill Tag Input ────────────────────────────────────────────────────────
function SkillTagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const skills = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const addSkill = (raw) => {
    const skill = raw.trim();
    if (!skill || skills.includes(skill)) return;
    onChange([...skills, skill].join(', '));
    setInput('');
  };
  const removeSkill = (s) => onChange(skills.filter(x => x !== s).join(', '));
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(input); }
    else if (e.key === 'Backspace' && !input && skills.length > 0) removeSkill(skills[skills.length - 1]);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        Required Skills <span className="font-normal text-slate-400">(Enter or comma to add)</span>
      </label>
      <div className="flex flex-wrap gap-1.5 p-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all">
        {skills.map(skill => (
          <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold border border-violet-200">
            {skill}
            <button type="button" onClick={() => removeSkill(skill)} className="text-violet-400 hover:text-rose-500 font-bold">×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input.trim()) addSkill(input); }}
          placeholder={skills.length === 0 ? (placeholder || 'e.g. React, Node.js') : ''}
          className="flex-1 min-w-[120px] outline-none text-sm text-slate-700 bg-transparent placeholder-slate-400"
        />
      </div>
    </div>
  );
}

// ── Match Score Badge ──────────────────────────────────────────────────────
function MatchScoreBadge({ score }) {
  const textColor = score === 100 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : score >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : score > 0 ? 'text-sky-700 bg-sky-50 border-sky-200'
    : 'text-slate-500 bg-slate-50 border-slate-200';
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${textColor}`}>
      <Star className="w-3 h-3" />{score}% Match
    </div>
  );
}

// ── Bandwidth Bar ─────────────────────────────────────────────────────────
function BandwidthBar({ allocated, capacity, required }) {
  const pct = capacity > 0 ? Math.min((allocated / capacity) * 100, 100) : 0;
  const afterPct = capacity > 0 ? Math.min(((allocated + required) / capacity) * 100, 100) : 0;
  const available = Math.max(0, capacity - allocated);
  const wouldExceed = required > 0 && available < required;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1 text-slate-500">
        <span>{allocated} committed / {capacity} max hrs/wk</span>
        <span className={`font-semibold ${wouldExceed ? 'text-rose-600' : 'text-emerald-600'}`}>
          {available} hrs free
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
        <div
          className={`h-full absolute left-0 top-0 rounded-full transition-all ${wouldExceed ? 'bg-rose-400' : 'bg-sky-400'}`}
          style={{ width: `${pct}%` }}
        />
        {required > 0 && !wouldExceed && (
          <div
            className="h-full absolute top-0 bg-sky-200 rounded-full"
            style={{ left: `${pct}%`, width: `${Math.min(afterPct - pct, 100 - pct)}%` }}
          />
        )}
      </div>
      {wouldExceed && (
        <p className="text-xs text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Adding {required}h exceeds capacity ({allocated + required}h/{capacity}h)
        </p>
      )}
    </div>
  );
}

// ── Candidate Card (multi-select aware) ───────────────────────────────────
function CandidateCard({ candidate, requiredHours, onToggle, selected }) {
  const isOverCapacity = candidate.is_over_capacity;

  return (
    <div
      onClick={() => onToggle(candidate)}
      className={`
        relative rounded-xl border-2 p-4 cursor-pointer transition-all select-none
        ${selected
          ? 'border-violet-500 bg-violet-50 shadow-md'
          : isOverCapacity
            ? 'border-rose-200 bg-rose-50/50 opacity-75'
            : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm'
        }
      `}
    >
      {/* Checkbox indicator */}
      <div className={`
        absolute top-3 right-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
        ${selected ? 'border-violet-500 bg-violet-500' : isOverCapacity ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-white'}
      `}>
        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </div>

      {/* Header */}
      <div className="flex items-start gap-2 mb-3 pr-8">
        <div>
          <div className="font-bold text-slate-900 text-sm">{candidate.name}</div>
          <div className="text-xs text-slate-500">{candidate.email}</div>
        </div>
      </div>

      {/* Score + capacity warnings */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <MatchScoreBadge score={candidate.match_score} />
        {isOverCapacity && (
          <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 px-2 py-1 bg-rose-50 border border-rose-200 rounded-full">
            <ShieldAlert className="w-3 h-3" /> Under-capacity
          </span>
        )}
      </div>

      {/* Skill tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {candidate.skill_tags.slice(0, 5).map((skill, i) => {
          const isMatched = candidate.matched_skills.map(s => s.toLowerCase()).some(m =>
            skill.toLowerCase().includes(m) || m.includes(skill.toLowerCase())
          );
          return (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${isMatched
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'}`}
            >
              {isMatched && '✓ '}{skill}
            </span>
          );
        })}
        {candidate.skill_tags.length > 5 && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500 border border-slate-200">
            +{candidate.skill_tags.length - 5}
          </span>
        )}
      </div>

      {/* Bandwidth bar */}
      <BandwidthBar
        allocated={candidate.allocated_hours}
        capacity={candidate.weekly_capacity_hours}
        required={requiredHours}
      />

      {/* Current assignments */}
      {candidate.current_assignments.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-semibold mb-1">Currently on:</p>
          {candidate.current_assignments.slice(0, 2).map((a, i) => (
            <p key={i} className="text-xs text-slate-600">· {a.project_name} ({a.weekly_hours}h/wk)</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bulk Assignment Configuration Row ─────────────────────────────────────
function BulkAssignRow({ candidate, config, onChange, onRemove, formBase, billingCurrency }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {candidate.name.charAt(0)}
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900">{candidate.name}</span>
            <span className="ml-2 text-xs text-slate-500">{candidate.available_hours}h available</span>
            <span className="ml-2 text-xs font-semibold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
              {candidate.payout_currency} ({candidate.tax_region})
            </span>
            {candidate.tax_exempt && (
              <span className="ml-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                Tax-Exempt
              </span>
            )}
          </div>
          <MatchScoreBadge score={candidate.match_score} />
        </div>
        <button
          type="button"
          onClick={() => onRemove(candidate.id)}
          className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
          <input
            type="text"
            value={config.role || ''}
            onChange={e => onChange(candidate.id, 'role', e.target.value)}
            placeholder={formBase.role || 'e.g. Developer'}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Rate ($/hr)</label>
          <input
            type="number"
            step="0.01"
            value={config.billing_rate || ''}
            onChange={e => onChange(candidate.id, 'billing_rate', e.target.value)}
            placeholder={formBase.billing_rate || '85.00'}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Hrs/wk</label>
          <input
            type="number"
            value={config.weekly_hour_limit || ''}
            onChange={e => onChange(candidate.id, 'weekly_hour_limit', e.target.value)}
            placeholder={formBase.weekly_hour_limit || '40'}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Lock Ex. Rate</label>
          <input
            type="number"
            step="0.000001"
            value={config.fixed_exchange_rate || ''}
            onChange={e => onChange(candidate.id, 'fixed_exchange_rate', e.target.value)}
            placeholder={candidate.payout_currency === billingCurrency ? '1.0 (N/A)' : 'e.g. 83.5'}
            disabled={candidate.payout_currency === billingCurrency}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-violet-400 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminAssignments({ assignments = [], projects = [], contractors = [], onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [bulkResults, setBulkResults] = useState(null); // { success: [], failed: [] }
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    project_id: '',
    employee_id: '',
    role: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    billing_rate: '',
    weekly_hour_limit: '40'
  });

  // ── Smart Match state ──
  const [matchSkills, setMatchSkills] = useState('');
  const [matchHours, setMatchHours] = useState('');
  const [matchResults, setMatchResults] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [smartMode, setSmartMode] = useState(false);

  // ── Multi-select state ──
  // selectedCandidates: Map<id, candidate>
  const [selectedCandidates, setSelectedCandidates] = useState(new Map());
  // perCandidateConfig: Map<id, { role, billing_rate, weekly_hour_limit, fixed_exchange_rate }>
  const [perCandidateConfig, setPerCandidateConfig] = useState(new Map());
  const [showBulkConfig, setShowBulkConfig] = useState(false);

  // ── Exchange rate states ──
  const [exchangeRateInfo, setExchangeRateInfo] = useState(null);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [lockRate, setLockRate] = useState(false);
  const [lockedRateVal, setLockedRateVal] = useState('');

  const selectedProject = projects.find(p => String(p.id) === String(formData.project_id));
  const billingCurrency = selectedProject?.billing_currency || 'USD';
  
  const selectedContractor = contractors.find(c => String(c.id) === String(formData.employee_id));
  const payoutCurrency = selectedContractor?.payout_currency || 'USD';

  const handleOpenAdd = () => {
    setErrorMessage(null);
    setBulkResults(null);
    setMatchSkills('');
    setMatchHours('');
    setMatchResults(null);
    setSmartMode(false);
    setSelectedCandidates(new Map());
    setPerCandidateConfig(new Map());
    setShowBulkConfig(false);
    setLockRate(false);
    setLockedRateVal('');
    setExchangeRateInfo(null);
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

  // ── Smart Match API ──
  const runSmartMatch = useCallback(async () => {
    if (!matchSkills && !matchHours) { setMatchResults(null); return; }
    setMatchLoading(true);
    try {
      const params = new URLSearchParams();
      if (matchSkills) params.set('skills', matchSkills);
      if (matchHours) params.set('requiredHours', matchHours);
      const res = await fetch(`/api/match?${params.toString()}`);
      const data = await res.json();
      setMatchResults(data);
    } catch (err) {
      console.error('Smart match error:', err);
    } finally {
      setMatchLoading(false);
    }
  }, [matchSkills, matchHours]);

  useEffect(() => {
    if (!smartMode) return;
    const timer = setTimeout(() => { runSmartMatch(); }, 400);
    return () => clearTimeout(timer);
  }, [matchSkills, matchHours, smartMode, runSmartMatch]);

  // Fetch exchange rate for selected contractor and project in manual mode
  useEffect(() => {
    if (smartMode) return;
    if (!billingCurrency || !payoutCurrency) {
      setExchangeRateInfo(null);
      return;
    }
    if (billingCurrency === payoutCurrency) {
      setExchangeRateInfo({ rate: 1.0, display: `1 ${billingCurrency} = 1.0000 ${payoutCurrency}` });
      return;
    }
    let active = true;
    setFetchingRate(true);
    fetch(`/api/exchange-rate?from=${billingCurrency}&to=${payoutCurrency}`)
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        if (data.rate) {
          setExchangeRateInfo(data);
          setLockedRateVal(String(data.rate));
        } else {
          setExchangeRateInfo(null);
        }
      })
      .catch(err => {
        console.error('Failed to fetch exchange rate:', err);
        if (active) setExchangeRateInfo(null);
      })
      .finally(() => {
        if (active) setFetchingRate(false);
      });

    return () => { active = false; };
  }, [billingCurrency, payoutCurrency, smartMode]);

  // ── Toggle a candidate in/out of selection ──
  const handleToggleCandidate = (candidate) => {
    setSelectedCandidates(prev => {
      const next = new Map(prev);
      if (next.has(candidate.id)) {
        next.delete(candidate.id);
        // also clean perCandidateConfig
        setPerCandidateConfig(c => { const n = new Map(c); n.delete(candidate.id); return n; });
      } else {
        next.set(candidate.id, candidate);
        // seed per-candidate config with defaults
        setPerCandidateConfig(c => {
          const n = new Map(c);
          if (!n.has(candidate.id)) {
            n.set(candidate.id, {
              role: formData.role || '',
              billing_rate: formData.billing_rate || '',
              weekly_hour_limit: matchHours || String(Math.min(candidate.available_hours, 40)) || '40'
            });
          }
          return n;
        });
      }
      return next;
    });
  };

  const handleRemoveCandidate = (id) => {
    setSelectedCandidates(prev => { const n = new Map(prev); n.delete(id); return n; });
    setPerCandidateConfig(prev => { const n = new Map(prev); n.delete(id); return n; });
  };

  const handleConfigChange = (id, field, value) => {
    setPerCandidateConfig(prev => {
      const n = new Map(prev);
      n.set(id, { ...(n.get(id) || {}), [field]: value });
      return n;
    });
  };

  // ── Select / Deselect All recommended ──
  const handleSelectAll = () => {
    if (!matchResults) return;
    const recommended = matchResults.recommended || [];
    const allSelected = recommended.every(c => selectedCandidates.has(c.id));
    if (allSelected) {
      // Deselect all recommended
      setSelectedCandidates(prev => {
        const n = new Map(prev);
        recommended.forEach(c => n.delete(c.id));
        return n;
      });
      setPerCandidateConfig(prev => {
        const n = new Map(prev);
        recommended.forEach(c => n.delete(c.id));
        return n;
      });
    } else {
      // Select all recommended
      setSelectedCandidates(prev => {
        const n = new Map(prev);
        recommended.forEach(c => n.set(c.id, c));
        return n;
      });
      setPerCandidateConfig(prev => {
        const n = new Map(prev);
        recommended.forEach(c => {
          if (!n.has(c.id)) {
            n.set(c.id, {
              role: formData.role || '',
              billing_rate: formData.billing_rate || '',
              weekly_hour_limit: matchHours || String(Math.min(c.available_hours, 40)) || '40'
            });
          }
        });
        return n;
      });
    }
  };

  // ── Single assignment (non-smart or single selection) ──
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    const selectedContractor = contractors.find(c => c.id === parseInt(formData.employee_id, 10));
    if (selectedContractor && selectedContractor.availability === 'UNAVAILABLE') {
      setErrorMessage(`Cannot assign ${selectedContractor.name}. Status is UNAVAILABLE.`);
      return;
    }
    try {
      const payload = {
        ...formData,
        fixed_exchange_rate: lockRate && lockedRateVal ? parseFloat(lockedRateVal) : null
      };
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) { setErrorMessage(json.error || 'Failed to create assignment'); return; }
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // ── Bulk assign all selected candidates ──
  const handleBulkAssign = async () => {
    if (selectedCandidates.size === 0) return;
    if (!formData.start_date || !formData.end_date) {
      setErrorMessage('Please fill in Start Date and End Date before bulk assigning.');
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);

    const results = { success: [], failed: [] };
    const entries = Array.from(selectedCandidates.values());

    for (const candidate of entries) {
      const config = perCandidateConfig.get(candidate.id) || {};
      const payload = {
        project_id: formData.project_id,
        employee_id: candidate.id,
        role: config.role || formData.role || 'Contractor',
        start_date: formData.start_date,
        end_date: formData.end_date,
        billing_rate: config.billing_rate || formData.billing_rate || '0',
        weekly_hour_limit: config.weekly_hour_limit || formData.weekly_hour_limit || '40',
        fixed_exchange_rate: config.fixed_exchange_rate && config.fixed_exchange_rate !== '' ? parseFloat(config.fixed_exchange_rate) : null
      };

      try {
        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) {
          results.failed.push({ name: candidate.name, reason: json.error || 'Unknown error' });
        } else {
          results.success.push({ name: candidate.name });
        }
      } catch (err) {
        results.failed.push({ name: candidate.name, reason: err.message });
      }
    }

    setSubmitting(false);
    setBulkResults(results);
    if (results.success.length > 0 && onRefresh) onRefresh();
    // Auto-close if all succeeded
    if (results.failed.length === 0) {
      setTimeout(() => setIsModalOpen(false), 1800);
    }
  };

  const allCandidates = matchResults
    ? [...(matchResults.recommended || []), ...(matchResults.under_capacity || [])]
    : [];

  const selectedCount = selectedCandidates.size;
  const isBulkMode = smartMode && selectedCount > 0;
  const recommendedAll = matchResults?.recommended?.every(c => selectedCandidates.has(c.id)) ?? false;

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

      {/* ── Assignment Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Contractor to Project">
        <div className="space-y-4">
          {/* Bulk assignment results banner */}
          {bulkResults && (
            <div className="rounded-xl overflow-hidden border">
              {bulkResults.success.length > 0 && (
                <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center gap-2 text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <strong>{bulkResults.success.length} assigned:</strong>
                  {bulkResults.success.map(r => r.name).join(', ')}
                </div>
              )}
              {bulkResults.failed.length > 0 && (
                <div className="bg-rose-50 px-4 py-2.5 space-y-1">
                  {bulkResults.failed.map((r, i) => (
                    <p key={i} className="text-xs text-rose-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> <strong>{r.name}</strong>: {r.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMessage && <Alert type="danger" title="Error">{errorMessage}</Alert>}

          {/* Project selector */}
          <Select
            label="Select Project"
            value={formData.project_id}
            onChange={e => setFormData({ ...formData, project_id: e.target.value })}
            options={projects.map(p => ({ value: p.id, label: `${p.name} (${p.client_name})` }))}
          />

          {/* ── Smart Match Panel ── */}
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-sky-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-bold text-violet-800">Smart Bench Matcher</span>
                <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-semibold">Multi-Select</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSmartMode(!smartMode);
                  setMatchResults(null);
                  setSelectedCandidates(new Map());
                  setPerCandidateConfig(new Map());
                  setShowBulkConfig(false);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${smartMode ? 'bg-violet-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${smartMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {smartMode ? (
              <div className="space-y-3">
                <p className="text-xs text-violet-700">
                  Select <strong>one or multiple contractors</strong> to assign to this project. Use Ctrl+click or tap multiple cards.
                </p>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-3">
                  <SkillTagInput value={matchSkills} onChange={setMatchSkills} placeholder="e.g. React, AWS" />
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estimated Weekly Hours</label>
                    <input
                      type="number" min="1" max="80" value={matchHours}
                      onChange={e => setMatchHours(e.target.value)}
                      placeholder="20"
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                {matchLoading && (
                  <div className="flex items-center justify-center gap-2 py-6 text-violet-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Finding best matches...</span>
                  </div>
                )}

                {matchResults && !matchLoading && (
                  <div>
                    {/* Summary + Select All */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Target className="w-3.5 h-3.5" />
                        <span>
                          <strong className="text-emerald-700">{matchResults.meta.recommended_count}</strong> recommended ·{' '}
                          <strong className="text-rose-600">{matchResults.meta.under_capacity_count}</strong> under-capacity
                        </span>
                      </div>
                      {matchResults.recommended.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                            recommendedAll
                              ? 'bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-violet-400 hover:text-violet-700'
                          }`}
                        >
                          {recommendedAll ? '✓ All Selected' : 'Select All Recommended'}
                        </button>
                      )}
                    </div>

                    {/* Selection count pill */}
                    {selectedCount > 0 && (
                      <div className="flex items-center justify-between mb-2 px-3 py-2 bg-violet-100 border border-violet-300 rounded-xl">
                        <span className="text-xs font-bold text-violet-800 flex items-center gap-1.5">
                          <Users className="w-4 h-4" /> {selectedCount} contractor{selectedCount !== 1 ? 's' : ''} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => { setSelectedCandidates(new Map()); setPerCandidateConfig(new Map()); }}
                          className="text-xs text-violet-500 hover:text-rose-600 font-semibold"
                        >
                          Clear all
                        </button>
                      </div>
                    )}

                    {/* Candidate list */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {matchResults.recommended.length > 0 && (
                        <>
                          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 sticky top-0 bg-violet-50/80 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Recommended
                          </p>
                          {matchResults.recommended.map(c => (
                            <CandidateCard
                              key={c.id}
                              candidate={c}
                              requiredHours={parseInt(matchHours || 0, 10)}
                              onToggle={handleToggleCandidate}
                              selected={selectedCandidates.has(c.id)}
                            />
                          ))}
                        </>
                      )}

                      {matchResults.under_capacity.length > 0 && (
                        <>
                          <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-3 sticky top-0 bg-violet-50/80 py-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Under-Capacity
                          </p>
                          {matchResults.under_capacity.map(c => (
                            <CandidateCard
                              key={c.id}
                              candidate={c}
                              requiredHours={parseInt(matchHours || 0, 10)}
                              onToggle={handleToggleCandidate}
                              selected={selectedCandidates.has(c.id)}
                            />
                          ))}
                        </>
                      )}

                      {allCandidates.length === 0 && (
                        <p className="text-sm text-center text-slate-500 py-4">No contractors found.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-violet-600">Enable Smart Matcher to get AI-ranked candidates — then multi-select and bulk assign them in one click.</p>
            )}
          </div>

          {/* ── Single / Manual contractor selector ── */}
          {!smartMode && (
            <Select
              label="Select Contractor"
              value={formData.employee_id}
              onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
              options={contractors.map(c => ({
                value: c.id,
                label: `${c.name} - ${c.availability === 'UNAVAILABLE' ? '[UNAVAILABLE]' : c.availability}`
              }))}
            />
          )}

          {/* ── Currency & Tax Region Preview Panel (for single mode) ── */}
          {!smartMode && selectedContractor && selectedProject && (
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Currency & Tax Support</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Client Billing Currency:</span>
                  <span className="font-bold text-slate-800">{billingCurrency}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contractor Payout Currency:</span>
                  <span className="font-bold text-slate-800">
                    {payoutCurrency} ({selectedContractor.tax_region || 'US-DEFAULT'})
                    {selectedContractor.tax_exempt && <span className="ml-1.5 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">EXEMPT</span>}
                  </span>
                </div>
              </div>
              
              {billingCurrency !== payoutCurrency && (
                <div className="pt-2 border-t border-sky-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">
                      Live Exchange Rate:
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {fetchingRate ? 'Fetching...' : exchangeRateInfo ? exchangeRateInfo.display : 'Unavailable'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="lockExchangeRate"
                      checked={lockRate}
                      onChange={e => setLockRate(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <label htmlFor="lockExchangeRate" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Lock exchange rate for this assignment
                    </label>
                  </div>
                  
                  {lockRate && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Locked Rate:</span>
                      <input 
                        type="number" 
                        step="0.000001" 
                        value={lockedRateVal}
                        onChange={e => setLockedRateVal(e.target.value)}
                        className="px-2 py-1 text-xs rounded border border-slate-200 outline-none w-28 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Shared fields (role, dates, rate) ── */}
          <Input
            label={isBulkMode ? 'Default Role (applied to all, overridable per-person)' : 'Assigned Role'}
            required={!isBulkMode}
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            placeholder="e.g. Senior Frontend Engineer"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={isBulkMode ? 'Default Billing Rate ($/hr)' : 'Billing Rate ($/hr)'}
              type="number" step="0.01" required={!isBulkMode}
              value={formData.billing_rate}
              onChange={e => setFormData({ ...formData, billing_rate: e.target.value })}
              placeholder="85.00"
            />
            <Input
              label={isBulkMode ? 'Default Weekly Hours' : 'Weekly Hour Limit'}
              type="number" required={!isBulkMode}
              value={formData.weekly_hour_limit}
              onChange={e => setFormData({ ...formData, weekly_hour_limit: e.target.value })}
              placeholder="40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            <Input label="End Date" type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
          </div>

          {/* ── Per-candidate config expander (bulk mode) ── */}
          {isBulkMode && (
            <div className="rounded-xl border border-violet-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBulkConfig(!showBulkConfig)}
                className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 text-sm font-semibold text-violet-800 hover:bg-violet-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Per-Contractor Configuration
                  <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full">{selectedCount} people</span>
                </span>
                {showBulkConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showBulkConfig && (
                <div className="p-3 space-y-2 bg-white">
                  <p className="text-xs text-slate-500 mb-2">Customize role, rate, and hours per contractor. Leave blank to use the defaults above.</p>
                  {Array.from(selectedCandidates.values()).map(candidate => (
                    <BulkAssignRow
                      key={candidate.id}
                      candidate={candidate}
                      config={perCandidateConfig.get(candidate.id) || {}}
                      onChange={handleConfigChange}
                      onRemove={handleRemoveCandidate}
                      formBase={formData}
                      billingCurrency={billingCurrency}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>

            {isBulkMode ? (
              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={submitting}
                className={`
                  inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${submitting
                    ? 'bg-violet-300 text-white cursor-not-allowed'
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-violet-200'}
                `}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</>
                  : <><Send className="w-4 h-4" /> Bulk Assign {selectedCount} Contractor{selectedCount !== 1 ? 's' : ''}</>
                }
              </button>
            ) : (
              <form onSubmit={handleSingleSubmit} className="contents">
                <Button variant="primary" type="submit">Create Assignment</Button>
              </form>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
