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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">WorkForce Platform</h2>
        <p className="mt-2 text-sm text-slate-500">Contingent Workforce, Timesheets & Milestone Billing</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <Alert type="danger" title="Authentication Error">
                {error}
              </Alert>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
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
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
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
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 rounded-xl font-bold"
            >
              Sign In to Workspace <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Demo Login Auto-Fill Chips */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Access Credentials</h3>
            
            <div className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => handleQuickFill('eleanor.vance@vendorcorp.com')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-slate-900">Vendor Admin</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wide">Full Access</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">Manages workforce, billing, projects, and vendor settings.</p>
                <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-200 px-3 py-1.5 rounded-md">
                  <span>eleanor.vance@vendorcorp.com</span>
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => handleQuickFill('sarah.j@vendorcorp.com')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold text-slate-900">Project Manager</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">Approves timesheets, milestones, and assigns workforce.</p>
                <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-200 px-3 py-1.5 rounded-md">
                  <span>sarah.j@vendorcorp.com</span>
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => handleQuickFill('alex.rivera@contractor.io')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-bold text-slate-900">Contractor / Employee</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">Logs timesheets, submits milestones, views active projects.</p>
                <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-200 px-3 py-1.5 rounded-md">
                  <span>alex.rivera@contractor.io</span>
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => handleQuickFill('client@client.com', 'client')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-slate-900">Client Organization</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">Creates project requirements and views project status.</p>
                <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-200 px-3 py-1.5 rounded-md">
                  <span>client@client.com</span>
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-4 font-medium">
              Staff password: <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-blue-600">password123</code>
              &nbsp;·&nbsp;
              Client password: <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-rose-500">client</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
