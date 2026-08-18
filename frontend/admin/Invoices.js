'use client';
import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  StatusBadge,
  Modal,
  Badge,
  Alert
} from '../components/UI.js';
import { Receipt, Send, CheckCircle, Eye, DollarSign } from 'lucide-react';

export default function AdminInvoices({ invoices = [], onRefresh }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleSubmitInvoice = async (invoiceId) => {
    try {
      await fetch(`/api/invoices/${invoiceId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to submit invoice:', err);
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to mark invoice as paid:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vendor Invoices & Client Settlement</h2>
          <p className="text-sm text-slate-500">Track client billing status, submit validated invoices, and confirm payments.</p>
        </div>
      </div>

      <Card>
        <Table headers={['Invoice Number', 'Client / Project', 'Invoice Date', 'Subtotal', 'Tax (18%)', 'Total', 'Status', 'Actions']}>
          {invoices.map(inv => (
            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-extrabold text-slate-900">{inv.invoice_number}</td>
              <td className="px-6 py-4">
                <div className="font-semibold text-slate-800">{inv.client_name || inv.project_name}</div>
                <div className="text-xs text-slate-500">{inv.project_name}</div>
              </td>
              <td className="px-6 py-4 text-xs font-medium text-slate-600">{inv.invoice_date}</td>
              <td className="px-6 py-4">${parseFloat(inv.subtotal).toLocaleString()}</td>
              <td className="px-6 py-4 text-slate-500">${parseFloat(inv.tax).toLocaleString()}</td>
              <td className="px-6 py-4 font-bold text-sky-700">${parseFloat(inv.total).toLocaleString()}</td>
              <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
              <td className="px-6 py-4 space-x-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)}>
                  <Eye className="w-3.5 h-3.5" /> Details
                </Button>
                {inv.status === 'DRAFT' && (
                  <Button variant="primary" size="sm" onClick={() => handleSubmitInvoice(inv.id)}>
                    <Send className="w-3.5 h-3.5" /> Submit
                  </Button>
                )}
                {inv.status === 'SUBMITTED' && (
                  <Button variant="success" size="sm" onClick={() => handleMarkPaid(inv.id)}>
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title={`Invoice ${selectedInvoice.invoice_number}`} maxWidth="max-w-3xl">
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="font-extrabold text-xl text-slate-900">{selectedInvoice.invoice_number}</h3>
                <p className="text-sm font-semibold text-slate-700">{selectedInvoice.client_name}</p>
                <p className="text-xs text-slate-500">Issued Date: {selectedInvoice.invoice_date}</p>
              </div>
              <StatusBadge status={selectedInvoice.status} />
            </div>

            {/* Itemized list */}
            <div>
              <h4 className="font-bold text-sm text-slate-800 mb-3">Itemized Line Items</h4>
              <Table headers={['Type', 'Description', 'Qty / Hours', 'Rate ($)', 'Total ($)']}>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  selectedInvoice.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><Badge variant={item.type === 'TIMESHEET' ? 'info' : 'indigo'}>{item.type}</Badge></td>
                      <td className="px-4 py-3 font-medium text-slate-800 text-xs">{item.description}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{item.quantity}</td>
                      <td className="px-4 py-3 text-xs">${parseFloat(item.rate).toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 text-xs">${parseFloat(item.amount).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-xs text-slate-500 text-center">No line items.</td>
                  </tr>
                )}
              </Table>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm border">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold">${parseFloat(selectedInvoice.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Tax (18% Configured Rate)</span>
                <span className="font-semibold">${parseFloat(selectedInvoice.tax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base border-t pt-2 text-sky-700">
                <span>Grand Total</span>
                <span>${parseFloat(selectedInvoice.total).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
              {selectedInvoice.status === 'DRAFT' && (
                <Button variant="primary" onClick={() => { handleSubmitInvoice(selectedInvoice.id); setSelectedInvoice(null); }}>
                  <Send className="w-4 h-4" /> Submit Invoice to Client
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
