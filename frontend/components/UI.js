'use client';
import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

export function Card({ children, className = '', title, action }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-sm transition-all hover:shadow-md ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, change, trend = 'up', color = 'brand' }) {
  const colorStyles = {
    brand: 'bg-sky-50 text-sky-600 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
        <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
        {change && (
          <span className={`inline-block mt-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-slate-500'}`}>
            {change}
          </span>
        )}
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl border ${colorStyles[color] || colorStyles.brand}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}

export function Badge({ children, variant = 'default', size = 'md' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1 text-sm font-semibold',
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${variants[variant] || variants.default} ${sizes[size]}`}>
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
  };

  const config = map[status] || { label: status, variant: 'default' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function Button({ children, variant = 'primary', size = 'md', className = '', loading = false, disabled = false, ...props }) {
  const variants = {
    primary: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-200',
    secondary: 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm',
    ghost: 'hover:bg-slate-100 text-slate-700',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg font-medium',
    md: 'px-4 py-2 text-sm rounded-lg font-semibold',
    lg: 'px-5 py-2.5 text-base rounded-xl font-semibold',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
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
      {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
      <input
        className={`w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export function Select({ label, options = [], error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
      <select
        className={`w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
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
      {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
      <textarea
        className={`w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export function Table({ headers = [], children, emptyText = 'No records found' }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">{children}</tbody>
      </table>
    </div>
  );
}

export function Alert({ title, children, type = 'info' }) {
  const types = {
    info: { bg: 'bg-sky-50 border-sky-200 text-sky-900', icon: Info, iconColor: 'text-sky-600' },
    success: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: CheckCircle, iconColor: 'text-emerald-600' },
    warning: { bg: 'bg-amber-50 border-amber-200 text-amber-900', icon: AlertTriangle, iconColor: 'text-amber-600' },
    danger: { bg: 'bg-rose-50 border-rose-200 text-rose-900', icon: AlertCircle, iconColor: 'text-rose-600' },
  };

  const config = types[type] || types.info;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 ${config.bg}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
      <div className="text-sm">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <div className="text-slate-700 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-xl border border-slate-200 w-full ${maxWidth} overflow-hidden transform transition-all`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all">
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
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.id
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          {tab.icon && <tab.icon className="w-4 h-4" />}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
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
      <div className="p-4 rounded-full bg-slate-100 text-slate-400 mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="font-semibold text-slate-800 text-base">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mt-1">{description}</p>
    </div>
  );
}

export function LoadingSpinner({ text = 'Loading data...' }) {
  return (
    <div className="py-16 text-center flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}




// 'use client';
// import React from 'react';
// import { X, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

// export function Card({ children, className = '', title, action }) {
//   return (
//     <div className={`bg-white rounded-xl border border-slate-200/80 shadow-sm transition-all hover:shadow-md ${className}`}>
//       {title && (
//         <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
//           <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
//           {action && <div>{action}</div>}
//         </div>
//       )}
//       <div className="p-6">{children}</div>
//     </div>
//   );
// }

// export function StatCard({ label, value, icon: Icon, change, trend = 'up', color = 'brand' }) {
//   const colorStyles = {
//     brand: 'bg-sky-50 text-sky-600 border-sky-100',
//     emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
//     amber: 'bg-amber-50 text-amber-600 border-amber-100',
//     rose: 'bg-rose-50 text-rose-600 border-rose-100',
//     indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
//   };

//   return (
//     <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
//       <div>
//         <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
//         <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
//         {change && (
//           <span className={`inline-block mt-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-slate-500'}`}>
//             {change}
//           </span>
//         )}
//       </div>
//       {Icon && (
//         <div className={`p-3 rounded-xl border ${colorStyles[color] || colorStyles.brand}`}>
//           <Icon className="w-6 h-6" />
//         </div>
//       )}
//     </div>
//   );
// }

// export function Badge({ children, variant = 'default', size = 'md' }) {
//   const variants = {
//     default: 'bg-slate-100 text-slate-700 border-slate-200',
//     success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
//     warning: 'bg-amber-50 text-amber-700 border-amber-200',
//     danger: 'bg-rose-50 text-rose-700 border-rose-200',
//     info: 'bg-sky-50 text-sky-700 border-sky-200',
//     indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
//     purple: 'bg-purple-50 text-purple-700 border-purple-200',
//   };

//   const sizes = {
//     sm: 'px-2 py-0.5 text-xs',
//     md: 'px-2.5 py-1 text-xs font-semibold',
//     lg: 'px-3 py-1 text-sm font-semibold',
//   };

//   return (
//     <span className={`inline-flex items-center rounded-full border ${variants[variant] || variants.default} ${sizes[size]}`}>
//       {children}
//     </span>
//   );
// }

// export function StatusBadge({ status }) {
//   const map = {
//     ACTIVE: { label: 'Active', variant: 'success' },
//     APPROVED: { label: 'Approved', variant: 'success' },
//     COMPLETED: { label: 'Completed', variant: 'success' },
//     PAID: { label: 'Paid', variant: 'success' },
//     PENDING: { label: 'Pending', variant: 'warning' },
//     IN_PROGRESS: { label: 'In Progress', variant: 'info' },
//     SUBMITTED: { label: 'Submitted', variant: 'indigo' },
//     DRAFT: { label: 'Draft', variant: 'default' },
//     REJECTED: { label: 'Rejected', variant: 'danger' },
//     UNAVAILABLE: { label: 'Unavailable', variant: 'danger' },
//     EXPIRING_SOON: { label: 'Expiring Soon', variant: 'warning' },
//   };

//   const config = map[status] || { label: status, variant: 'default' };
//   return <Badge variant={config.variant}>{config.label}</Badge>;
// }

// export function Button({ children, variant = 'primary', size = 'md', className = '', loading = false, disabled = false, ...props }) {
//   const variants = {
//     primary: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-200',
//     secondary: 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm',
//     outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm',
//     ghost: 'hover:bg-slate-100 text-slate-700',
//     success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200',
//     danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200',
//   };

//   const sizes = {
//     sm: 'px-3 py-1.5 text-xs rounded-lg font-medium',
//     md: 'px-4 py-2 text-sm rounded-lg font-semibold',
//     lg: 'px-5 py-2.5 text-base rounded-xl font-semibold',
//   };

//   return (
//     <button
//       className={`inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
//       disabled={disabled || loading}
//       {...props}
//     >
//       {loading && <Loader2 className="w-4 h-4 animate-spin" />}
//       {children}
//     </button>
//   );
// }

// export function Input({ label, error, className = '', ...props }) {
//   return (
//     <div className="w-full">
//       {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
//       <input
//         className={`w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
//         {...props}
//       />
//       {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
//     </div>
//   );
// }

// export function Select({ label, options = [], error, className = '', ...props }) {
//   return (
//     <div className="w-full">
//       {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
//       <select
//         className={`w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
//         {...props}
//       >
//         {options.map((opt, i) => (
//           <option key={i} value={opt.value}>
//             {opt.label}
//           </option>
//         ))}
//       </select>
//       {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
//     </div>
//   );
// }

// export function Textarea({ label, error, className = '', ...props }) {
//   return (
//     <div className="w-full">
//       {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
//       <textarea
//         className={`w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all ${error ? 'border-rose-500 ring-rose-200' : ''} ${className}`}
//         rows={3}
//         {...props}
//       />
//       {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
//     </div>
//   );
// }

// export function Table({ headers = [], children, emptyText = 'No records found' }) {
//   return (
//     <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
//       <table className="w-full text-left border-collapse text-sm">
//         <thead>
//           <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
//             {headers.map((h, i) => (
//               <th key={i} className="px-6 py-3.5">
//                 {h}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody className="divide-y divide-slate-100 text-slate-700">{children}</tbody>
//       </table>
//     </div>
//   );
// }

// export function Alert({ title, children, type = 'info' }) {
//   const types = {
//     info: { bg: 'bg-sky-50 border-sky-200 text-sky-900', icon: Info, iconColor: 'text-sky-600' },
//     success: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: CheckCircle, iconColor: 'text-emerald-600' },
//     warning: { bg: 'bg-amber-50 border-amber-200 text-amber-900', icon: AlertTriangle, iconColor: 'text-amber-600' },
//     danger: { bg: 'bg-rose-50 border-rose-200 text-rose-900', icon: AlertCircle, iconColor: 'text-rose-600' },
//   };

//   const config = types[type] || types.info;
//   const Icon = config.icon;

//   return (
//     <div className={`p-4 rounded-xl border flex items-start gap-3 ${config.bg}`}>
//       <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
//       <div className="text-sm">
//         {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
//         <div className="text-slate-700 leading-relaxed">{children}</div>
//       </div>
//     </div>
//   );
// }

// export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
//       <div className={`bg-white rounded-2xl shadow-xl border border-slate-200 w-full ${maxWidth} overflow-hidden transform transition-all`}>
//         <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//           <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
//           <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all">
//             <X className="w-5 h-5" />
//           </button>
//         </div>
//         <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
//       </div>
//     </div>
//   );
// }

// export function Tabs({ tabs = [], activeTab, onChange }) {
//   return (
//     <div className="border-b border-slate-200 flex gap-6">
//       {tabs.map(tab => (
//         <button
//           key={tab.id}
//           onClick={() => onChange(tab.id)}
//           className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
//             activeTab === tab.id
//               ? 'border-sky-600 text-sky-600'
//               : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
//           }`}
//         >
//           {tab.icon && <tab.icon className="w-4 h-4" />}
//           {tab.label}
//           {tab.count !== undefined && (
//             <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
//               {tab.count}
//             </span>
//           )}
//         </button>
//       ))}
//     </div>
//   );
// }

// export function EmptyState({ icon: Icon = Info, title = 'No data available', description = 'Try adjusting your filters or creating a new record.' }) {
//   return (
//     <div className="py-12 text-center flex flex-col items-center justify-center">
//       <div className="p-4 rounded-full bg-slate-100 text-slate-400 mb-3">
//         <Icon className="w-8 h-8" />
//       </div>
//       <h4 className="font-semibold text-slate-800 text-base">{title}</h4>
//       <p className="text-sm text-slate-500 max-w-sm mt-1">{description}</p>
//     </div>
//   );
// }

// export function LoadingSpinner({ text = 'Loading data...' }) {
//   return (
//     <div className="py-16 text-center flex flex-col items-center justify-center text-slate-500">
//       <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
//       <p className="text-sm font-medium">{text}</p>
//     </div>
//   );
// }
