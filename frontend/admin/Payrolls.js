'use client';
import React from 'react';
import { Card, Table, StatusBadge } from '../components/UI.js';

export default function ContractorPayrolls({ payrolls = [] }) {
  const totalPayrollGross = payrolls.reduce((acc, p) => acc + parseFloat(p.gross_pay || 0), 0);
  const totalHours = payrolls.reduce((acc, p) => acc + parseFloat(p.total_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Contractor Payroll Ledger</h2>
          <p className="text-sm text-slate-500">Milestone-triggered payouts calculated from approved timesheets & rate cards.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Processed Payroll Entries</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{payrolls.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Total Billed Hours</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{totalHours} hrs</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 p-5 rounded-xl text-white shadow-sm">
          <p className="text-xs uppercase font-semibold text-emerald-200">Total Contractor Gross Payout</p>
          <p className="text-2xl font-extrabold mt-1">${totalPayrollGross.toLocaleString()}</p>
        </div>
      </div>

      {/* Payroll Table */}
      <Card title="Contractor Payroll Records">
        {payrolls.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No payroll records generated yet. Payrolls auto-generate when milestones are approved.</p>
        ) : (
          <Table headers={['ID', 'Contractor', 'Project & Milestone', 'Hours Logged', 'Rate Card', 'Gross Payout', 'Status']}>
            {payrolls.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">PAY #{p.id}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{p.employee_name}</div>
                  <div className="text-xs text-slate-500">{p.employee_email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-800">{p.project_name}</div>
                  <div className="text-xs text-emerald-600 font-medium">{p.milestone_name}</div>
                </td>
                <td className="px-6 py-4 font-bold text-slate-800">{parseFloat(p.total_hours).toFixed(1)} hrs</td>
                <td className="px-6 py-4 text-slate-700 font-medium">${parseFloat(p.billing_rate).toFixed(2)}/hr</td>
                <td className="px-6 py-4 font-extrabold text-emerald-700">${parseFloat(p.gross_pay).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
