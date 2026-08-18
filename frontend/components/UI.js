'use client';
import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

export function Card({ children, className = '', title, subtitle, action }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}>
      {title && (
        <div className="px-6 py-4.5 border-b border-slate-100/80 flex items-center justify-between bg-slate-50/30">
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, change, trend = 'up', color = 'brand' }) {
  const colorStyles = {
    brand: 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 border-blue-100/80',
    emerald: 'bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 border-emerald-100/80',
    amber: 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 border-amber-100/80',
    rose: 'bg-gradient-to-br from-rose-50 to-red-50 text-rose-600 border-rose-100/80',
    indigo: 'bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 border-indigo-100/80',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
        <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
        {change && (
          <span className={`inline-block mt-1 text-xs font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-slate-500'}`}>
            {change}
          </span>
        )}
      </div>
      {Icon && (
        <div className={`p-3.5 rounded-2xl border shadow-xs ${colorStyles[color] || colorStyles.brand}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

export function Badge({ children, variant = 'default', size = 'md' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200/80',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
    info: 'bg-blue-50 text-blue-700 border-blue-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs font-bold',
    lg: 'px-3.5 py-1.5 text-xs font-extrabold',
  };

  return (
    <span className={`inline-flex items-center rounded-full border tracking-wide ${variants[variant] || variants.default} ${sizes[size]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    ACTIVE: { label: 'Active', variant: 'success' },
    APPROVED: { label: 'Approved', variant: 'success' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    PAID: { label: 'Paid', variant: 'success' },
    PENDING: { label: 'Pending', variant: 'warning' },
    IN_PROGRESS: { label: 'In Progress', variant: 'info' },
    SUBMITTED: { label: 'Submitted', variant: 'indigo' },
    DRAFT: { label: 'Draft', variant: 'default' },
    REJECTED: { label: 'Rejected', variant: 'danger' },
    UNAVAILABLE: { label: 'Unavailable', variant: 'danger' },
    EXPIRING_SOON: { label: 'Expiring Soon', variant: 'warning' },
    SENT: { label: 'Sent', variant: 'info' }
  };

  const config = map[status] || { label: status, variant: 'default' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function Button({ children, variant = 'primary', size = 'md', className = '', loading = false, disabled = false, ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 border border-blue-500/20',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm border border-slate-800',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs hover:border-slate-300',
    ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20',
    danger: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-500/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-xl font-semibold',
    md: 'px-4 py-2 text-sm rounded-xl font-bold',
    lg: 'px-5 py-2.5 text-base rounded-xl font-bold',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{label}</label>}
      <input
        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export function Select({ label, options = [], error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{label}</label>}
      <select
        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
        {...props}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{label}</label>}
      <textarea
        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export function Table({ headers = [], children, emptyText = 'No records found' }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">{children}</tbody>
      </table>
    </div>
  );
}

export function Alert({ title, children, message, type = 'info', className = '' }) {
  const types = {
    info: { bg: 'bg-blue-50/80 border-blue-200/80 text-blue-950', icon: Info, iconColor: 'text-blue-600' },
    success: { bg: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950', icon: CheckCircle, iconColor: 'text-emerald-600' },
    warning: { bg: 'bg-amber-50/80 border-amber-200/80 text-amber-950', icon: AlertTriangle, iconColor: 'text-amber-600' },
    danger: { bg: 'bg-rose-50/80 border-rose-200/80 text-rose-950', icon: AlertCircle, iconColor: 'text-rose-600' },
    error: { bg: 'bg-rose-50/80 border-rose-200/80 text-rose-950', icon: AlertCircle, iconColor: 'text-rose-600' },
  };

  const config = types[type] || types.info;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-xs ${config.bg} ${className}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
      <div className="text-sm">
        {title && <h5 className="font-bold mb-0.5 tracking-tight">{title}</h5>}
        <div className="leading-relaxed text-slate-700">{children || message}</div>
      </div>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className={`bg-white rounded-3xl shadow-2xl border border-slate-100 w-full ${maxWidth} overflow-hidden transform transition-all`}>
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-lg tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="border-b border-slate-200 flex gap-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          {tab.icon && <tab.icon className="w-4 h-4" />}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Info, title = 'No data available', description = 'Try adjusting your filters or creating a new record.' }) {
  return (
    <div className="py-12 text-center flex flex-col items-center justify-center">
      <div className="p-4 rounded-2xl bg-slate-100 text-slate-400 mb-3 border border-slate-200/50">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="font-bold text-slate-800 text-base">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mt-1">{description}</p>
    </div>
  );
}

export function LoadingSpinner({ text = 'Loading workspace...' }) {
  return (
    <div className="py-16 text-center flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
      <p className="text-sm font-semibold tracking-tight">{text}</p>
    </div>
  );
}
