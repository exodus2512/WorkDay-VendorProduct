'use client';
import React from 'react';
import { LogOut, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { Badge } from './UI.js';

export default function Header({ currentUser, onLogout, notificationsCount = 0, onRefresh }) {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'VENDOR_ADMIN':
        return <Badge variant="info">Vendor Admin</Badge>;
      case 'PROJECT_MANAGER':
        return <Badge variant="indigo">Project Manager</Badge>;
      case 'EMPLOYEE':
        return <Badge variant="success">Contractor</Badge>;
      default:
        return <Badge variant="default">{role}</Badge>;
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {currentUser?.role === 'VENDOR_ADMIN' && 'Vendor Workforce Command Center'}
          {currentUser?.role === 'PROJECT_MANAGER' && 'Project Management Portal'}
          {currentUser?.role === 'EMPLOYEE' && 'Contractor Workspace'}
        </h2>
        {currentUser?.role && getRoleBadge(currentUser.role)}
      </div>

      <div className="flex items-center gap-4">
        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Logged in User Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200/80">
          <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-sm">
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-extrabold text-slate-900 leading-tight">{currentUser?.name || 'Authenticated User'}</p>
            <p className="text-[10px] text-slate-500 font-semibold">{currentUser?.email || ''}</p>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all active:scale-[0.98]"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
