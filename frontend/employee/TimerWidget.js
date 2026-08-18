"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Clock, AlertTriangle, ChevronDown, CheckCircle, Loader } from "lucide-react";

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function TimerWidget({ assignments = [], milestones = [], empUser, onStop }) {
  const [status, setStatus] = useState("IDLE"); // IDLE | RUNNING | PAUSED | LOADING
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [session, setSession] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignments[0]?.id || "");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState(null);
  const [budgetExceeded, setBudgetExceeded] = useState(false);
  const [stopNote, setStopNote] = useState("");
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const lastResumedRef = useRef(null);
  const serverTotalRef = useRef(0);
  const intervalRef = useRef(null);
  const heartbeatRef = useRef(null);
  const idleTimerRef = useRef(null);
  const idleWarningShownRef = useRef(false);

  // Filter milestones for the selected assignment
  const selectedAssignment = assignments.find(a => String(a.id) === String(selectedAssignmentId));
  const projectId = selectedAssignment?.project_id;
  const filteredMilestones = milestones.filter(m =>
    String(m.project_id) === String(projectId) &&
    (m.status === "APPROVED" || m.status === "IN_PROGRESS" || m.status === "PENDING")
  );
  const selectedMilestone = filteredMilestones.find(m => String(m.id) === String(selectedMilestoneId));
  const milestoneBudgetSeconds = selectedMilestone ? parseFloat(selectedMilestone.amount || 0) * 3600 : null;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Start the local display interval
  const startInterval = useCallback((serverTotal, resumedAt) => {
    clearInterval(intervalRef.current);
    serverTotalRef.current = serverTotal;
    lastResumedRef.current = resumedAt;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(lastResumedRef.current).getTime()) / 1000);
      const total = serverTotalRef.current + elapsed;
      setDisplaySeconds(total);
      if (milestoneBudgetSeconds && total > milestoneBudgetSeconds) {
        setBudgetExceeded(true);
      }
    }, 1000);
  }, [milestoneBudgetSeconds]);

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (empUser?.id) {
      headers['x-user-id'] = String(empUser.id);
    }
    return headers;
  }, [empUser]);

  // Start heartbeat (every 15s)
  const startHeartbeat = useCallback(() => {
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(async () => {
      try {
        await fetch("/api/timer/heartbeat", { method: "PATCH", headers: getAuthHeaders() });
      } catch (e) {}
    }, 15000);
  }, [getAuthHeaders]);

  // Idle detection — reset on activity
  const resetIdleTimer = useCallback(() => {
    idleWarningShownRef.current = false;
    clearTimeout(idleTimerRef.current);
    if (status === "RUNNING") {
      idleTimerRef.current = setTimeout(async () => {
        if (!idleWarningShownRef.current) {
          idleWarningShownRef.current = true;
          const confirm = window.confirm("You have been idle for 10 minutes. Pause your timer?");
          if (confirm) {
            await handlePause();
          }
        }
      }, 10 * 60 * 1000); // 10 minutes
    }
  }, [status]);

  // On mount: restore any active session from server
  useEffect(() => {
    const restore = async () => {
      try {
        const userIdParam = empUser?.id ? `?user_id=${empUser.id}` : '';
        const res = await fetch(`/api/timer/active${userIdParam}`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.status === "RUNNING") {
          setSession(data);
          setStatus("RUNNING");
          setSelectedAssignmentId(String(data.assignment_id));
          setSelectedMilestoneId(String(data.milestone_id || ""));
          setDisplaySeconds(data.display_seconds);
          startInterval(data.total_seconds_accumulated, data.last_resumed_at);
          startHeartbeat();
        } else if (data && data.status === "PAUSED") {
          setSession(data);
          setStatus("PAUSED");
          setSelectedAssignmentId(String(data.assignment_id));
          setSelectedMilestoneId(String(data.milestone_id || ""));
          setDisplaySeconds(data.display_seconds);
        }
      } catch (e) {}
    };
    restore();
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(heartbeatRef.current);
      clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Page Visibility API: auto-pause on tab hide, auto-resume on show
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.hidden && status === "RUNNING") {
        await handlePause();
      } else if (!document.hidden && status === "PAUSED" && session) {
        await handleResume();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [status, session]);

  // Idle detection listeners
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    return () => events.forEach(e => window.removeEventListener(e, resetIdleTimer));
  }, [resetIdleTimer]);

  const handleStart = async () => {
    if (!selectedAssignmentId) return showToast("Please select an assignment first.", "error");
    setStatus("LOADING");
    try {
      const res = await fetch("/api/timer/start", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          assignment_id: Number(selectedAssignmentId),
          milestone_id: selectedMilestoneId ? Number(selectedMilestoneId) : null,
          notes,
          user_id: empUser?.id
        })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || "Failed to start timer.", "error");
      setSession(data);
      setStatus("RUNNING");
      setBudgetExceeded(false);
      startInterval(0, data.last_resumed_at);
      startHeartbeat();
      resetIdleTimer();
      showToast("Timer started!");
    } catch (e) {
      showToast("Network error.", "error");
    } finally {
      setStatus(prev => prev === "LOADING" ? "IDLE" : prev);
    }
  };

  const handlePause = async () => {
    clearInterval(intervalRef.current);
    clearInterval(heartbeatRef.current);
    setStatus("LOADING");
    try {
      const res = await fetch("/api/timer/pause", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: empUser?.id })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || "Failed to pause.", "error");
      setSession(data);
      setStatus("PAUSED");
      setDisplaySeconds(data.display_seconds);
      showToast("Timer paused.");
    } catch (e) {
      showToast("Network error.", "error");
    }
  };

  const handleResume = async () => {
    setStatus("LOADING");
    try {
      const res = await fetch("/api/timer/resume", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: empUser?.id })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || "Failed to resume.", "error");
      setSession(data);
      setStatus("RUNNING");
      startInterval(data.total_seconds_accumulated, data.last_resumed_at);
      startHeartbeat();
      resetIdleTimer();
      showToast("Timer resumed!");
    } catch (e) {
      showToast("Network error.", "error");
    }
  };

  const handleStop = async () => {
    setShowStopConfirm(false);
    clearInterval(intervalRef.current);
    clearInterval(heartbeatRef.current);
    clearTimeout(idleTimerRef.current);
    setStatus("LOADING");
    try {
      const res = await fetch("/api/timer/stop", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes: stopNote, user_id: empUser?.id })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || "Failed to stop timer.", "error");
      setStatus("IDLE");
      setSession(null);
      setDisplaySeconds(0);
      setBudgetExceeded(false);
      setStopNote("");
      showToast(`${data.hours_logged}h logged to your timesheet!`);
      if (onStop) onStop();
    } catch (e) {
      showToast("Network error.", "error");
    }
  };

  const isLoading = status === "LOADING";
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isIdle = status === "IDLE";

  return (
    <div className={`relative rounded-2xl border shadow-lg overflow-hidden transition-all duration-300 ${
      budgetExceeded ? "border-red-400 bg-red-50" :
      isRunning ? "border-emerald-400 bg-gradient-to-br from-slate-900 to-slate-800" :
      isPaused ? "border-amber-400 bg-amber-50" :
      "border-slate-200 bg-white"
    }`}>
      {/* Status bar */}
      <div className={`h-1 transition-all duration-300 ${
        budgetExceeded ? "bg-red-500" :
        isRunning ? "bg-emerald-400 animate-pulse" :
        isPaused ? "bg-amber-400" :
        "bg-slate-200"
      }`} />

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${isRunning ? "text-emerald-400" : "text-slate-500"}`} />
            <h3 className={`font-bold text-sm uppercase tracking-wider ${isRunning ? "text-white" : "text-slate-700"}`}>
              Time Tracker
            </h3>
            {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
          </div>
          {(isRunning || isPaused) && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPaused ? "bg-amber-100 text-amber-800" : "bg-emerald-900 text-emerald-300"
            }`}>
              {isPaused ? "⏸ PAUSED" : "● LIVE"}
            </span>
          )}
        </div>

        {/* Timer Display */}
        <div className={`text-center py-3 mb-4 rounded-xl ${
          isRunning ? "bg-slate-800" : isPaused ? "bg-amber-100/60" : "bg-slate-50"
        }`}>
          <div className={`font-mono text-4xl font-black tracking-widest transition-colors ${
            budgetExceeded ? "text-red-600" :
            isRunning ? "text-white" :
            isPaused ? "text-amber-700" :
            "text-slate-400"
          }`}>
            {formatTime(displaySeconds)}
          </div>
          {budgetExceeded && (
            <div className="flex items-center justify-center gap-1 mt-1 text-red-600 text-xs font-semibold">
              <AlertTriangle className="w-3 h-3" /> Budget hours exceeded
            </div>
          )}
          {selectedMilestone && !budgetExceeded && (isRunning || isPaused) && (
            <div className="text-xs text-slate-400 mt-1 truncate px-2">
              📌 {selectedMilestone.name}
            </div>
          )}
        </div>

        {/* Assignment / Milestone selectors (only when idle) */}
        {isIdle && (
          <div className="space-y-2 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Assignment</label>
              <div className="relative">
                <select
                  value={selectedAssignmentId}
                  onChange={e => { setSelectedAssignmentId(e.target.value); setSelectedMilestoneId(""); }}
                  className="w-full appearance-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.project_name || `Assignment #${a.id}`} — {a.role}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
            {filteredMilestones.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Tag to Milestone <span className="text-slate-400 font-normal">(optional)</span></label>
                <div className="relative">
                  <select
                    value={selectedMilestoneId}
                    onChange={e => setSelectedMilestoneId(e.target.value)}
                    className="w-full appearance-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  >
                    <option value="">— No milestone tag —</option>
                    {filteredMilestones.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            )}
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional: what are you working on?"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isIdle && (
            <button
              onClick={handleStart}
              disabled={!selectedAssignmentId}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Play className="w-4 h-4" /> Start Timer
            </button>
          )}

          {isRunning && (
            <>
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all"
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
              <button
                onClick={() => setShowStopConfirm(true)}
                className={`flex-1 flex items-center justify-center gap-2 font-bold text-sm py-2.5 px-4 rounded-xl transition-all ${
                  budgetExceeded
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                }`}
              >
                <Square className="w-4 h-4" /> Stop & Log
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                onClick={handleResume}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all"
              >
                <Play className="w-4 h-4" /> Resume
              </button>
              <button
                onClick={() => setShowStopConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all"
              >
                <Square className="w-4 h-4" /> Stop & Log
              </button>
            </>
          )}

          {isLoading && (
            <div className="flex-1 flex items-center justify-center py-2.5">
              <Loader className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          )}
        </div>

        {/* Running context info */}
        {(isRunning || isPaused) && session && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${isRunning ? "bg-slate-700 text-slate-300" : "bg-amber-100 text-amber-800"}`}>
            <span className="font-semibold">{session.project_name || `Assignment #${session.assignment_id}`}</span>
            {session.notes && <span className="ml-2 opacity-70">— {session.notes}</span>}
          </div>
        )}
      </div>

      {/* Stop Confirmation Dialog */}
      {showStopConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
          <div className="bg-white rounded-xl p-5 m-4 shadow-2xl w-full max-w-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-1">Stop & Log Hours?</h4>
            <p className="text-xs text-slate-500 mb-3">
              <strong>{formatTime(displaySeconds)}</strong> will be converted to <strong>{(displaySeconds / 3600).toFixed(2)}h</strong> and logged to today&apos;s timesheet entry.
            </p>
            <input
              type="text"
              value={stopNote}
              onChange={e => setStopNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStop}
                className="flex-1 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`absolute top-3 right-3 text-xs font-bold px-3 py-2 rounded-lg shadow-md z-20 transition-all ${
          toast.type === "error" ? "bg-red-100 text-red-800 border border-red-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
