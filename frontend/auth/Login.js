'use client';
import React, { useState } from 'react';
import { Building2, Lock, Mail, ShieldCheck, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';
import { Button, Input, Alert } from '../components/UI.js';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      // Save token to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Server error during login');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (presetEmail, presetPassword = 'password123') => {
    setEmail(presetEmail);
    setPassword(presetPassword);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3.5 bg-sky-600 text-white rounded-2xl shadow-xl shadow-sky-900/50 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">WorkDay Platform</h2>
        <p className="mt-2 text-sm text-slate-400">Contingent Workforce, Timesheets & Milestone Billing</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <Alert type="danger" title="Authentication Error">
                {error}
              </Alert>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-900/50"
            >
              Sign In to Workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Login Auto-Fill Chips */}
          <div className="mt-8 border-t border-slate-800/80 pt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              ⚡ Quick Demo Persona Login:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('eleanor.vance@vendorcorp.com')}
                className="w-full p-2.5 rounded-xl border border-sky-900/50 bg-sky-950/30 hover:bg-sky-900/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-sky-300">Vendor Admin</p>
                  <p className="text-[10px] text-slate-400">eleanor.vance@vendorcorp.com</p>
                </div>
                <span className="text-[10px] font-semibold text-sky-400 group-hover:underline">Auto-fill →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('sarah.j@vendorcorp.com')}
                className="w-full p-2.5 rounded-xl border border-emerald-900/50 bg-emerald-950/30 hover:bg-emerald-900/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-emerald-300">Project Manager</p>
                  <p className="text-[10px] text-slate-400">sarah.j@vendorcorp.com</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 group-hover:underline">Auto-fill →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('alex.rivera@contractor.io')}
                className="w-full p-2.5 rounded-xl border border-indigo-900/50 bg-indigo-950/30 hover:bg-indigo-900/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-indigo-300">Employee / Contractor</p>
                  <p className="text-[10px] text-slate-400">alex.rivera@contractor.io</p>
                </div>
                <span className="text-[10px] font-semibold text-indigo-400 group-hover:underline">Auto-fill →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('client@client.com', 'client')}
                className="w-full p-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-rose-300">Client Portal</p>
                  <p className="text-[10px] text-slate-400">client@client.com · pass: client</p>
                </div>
                <span className="text-[10px] font-semibold text-rose-400 group-hover:underline">Auto-fill →</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-3 font-medium">
              Staff password: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-sky-400">password123</code>
              &nbsp;·&nbsp;
              Client password: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-rose-400">client</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
