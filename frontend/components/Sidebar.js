'use client';
import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  Calculator,
  Receipt,
  Clock,
  CheckSquare,
  Bell,
  Building2,
  FileCheck,
  DollarSign
} from 'lucide-react';

export default function Sidebar({ currentRole, activeSection, onSelectSection }) {
  const getNavItems = () => {
    switch (currentRole) {
      case 'VENDOR_ADMIN':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'clients', label: 'Manage Clients', icon: Building2 },
          { id: 'projects', label: 'Projects', icon: Briefcase },
          { id: 'workforce', label: 'Workforce', icon: Users },
          { id: 'assignments', label: 'Assignments', icon: UserCheck },
          { id: 'billing', label: 'Billable Hours', icon: Calculator },
          { id: 'invoices', label: 'Invoices', icon: Receipt },
          { id: 'payrolls', label: 'Contractor Payrolls', icon: DollarSign },
        ];
      case 'PROJECT_MANAGER':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'projects', label: 'My Projects', icon: Briefcase },
          { id: 'team', label: 'Project Team', icon: Users },
          { id: 'timesheets', label: 'Timesheets', icon: Clock },
          { id: 'milestones', label: 'Milestones', icon: CheckSquare },
          { id: 'payrolls', label: 'Contractor Payrolls', icon: DollarSign },
        ];
      case 'EMPLOYEE':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'assignment', label: 'My Assignment', icon: Briefcase },
          { id: 'timesheets', label: 'My Timesheets', icon: Clock },
          { id: 'milestones', label: 'Milestones', icon: CheckSquare },
          { id: 'payrolls', label: 'My Payrolls', icon: DollarSign },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ];
      case 'CLIENT':
        return [];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-sky-600 text-white rounded-xl shadow-md shadow-sky-900/50">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-extrabold text-white text-lg tracking-tight leading-tight">WorkForce</h1>
          <p className="text-xs text-sky-400 font-medium">Contingent Workforce</p>
        </div>
      </div>

      {/* Role Pill */}
      <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Active Portal</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-sky-300">
            {currentRole === 'VENDOR_ADMIN' && 'Vendor Admin'}
            {currentRole === 'PROJECT_MANAGER' && 'Project Manager'}
            {currentRole === 'EMPLOYEE' && 'Contractor Portal'}
            {currentRole === 'CLIENT' && 'Client Portal'}
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        <p className="font-semibold text-slate-400">Contingent Tracker MVP</p>
        <p className="mt-0.5 text-[11px]">Neon PostgreSQL Powered</p>
      </div>
    </aside>
  );
}
