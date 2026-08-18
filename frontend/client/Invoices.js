

'use client';
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, StatusBadge, Modal, Alert, Badge, Input } from '../components/UI.js';
import {
    Receipt, Download, Eye, DollarSign, Calendar, FileText,
    Search, CheckCircle2, Clock, Building, Briefcase, RefreshCw,
    FileCheck, Shield, ChevronRight, CreditCard
} from 'lucide-react';

export default function ClientInvoices({ clientUser, onRefreshParent }) {
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [downloadSuccess, setDownloadSuccess] = useState('');

    // Payment Flow States
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [paymentCurrency, setPaymentCurrency] = useState('USD');
    const [exchangeRate, setExchangeRate] = useState(1);
    const [calculatingRate, setCalculatingRate] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const SUPPORTED_CURRENCIES = ['USD','EUR','GBP','INR','AUD','CAD','SGD','JPY','AED','MYR'];

    useEffect(() => {
        if (!paymentInvoice) return;
        const billingCurrency = paymentInvoice.billing_currency || 'USD';
        if (paymentCurrency === billingCurrency) {
            setExchangeRate(1);
            return;
        }
        
        const fetchRate = async () => {
            setCalculatingRate(true);
            try {
                // e.g., from USD to INR
                const res = await fetch(`/api/exchange-rate?from=${billingCurrency}&to=${paymentCurrency}`);
                const data = await res.json();
                if (data.rate) setExchangeRate(data.rate);
            } catch (err) {
                console.error("Failed to fetch exchange rate", err);
            } finally {
                setCalculatingRate(false);
            }
        };
        fetchRate();
    }, [paymentCurrency, paymentInvoice]);

    const handlePayInvoice = async () => {
        if (!paymentInvoice) return;
        setIsPaying(true);
        try {
            const res = await fetch(`/api/invoices/${paymentInvoice.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'PAID',
                    payment_currency: paymentCurrency,
                    payment_exchange_rate: exchangeRate
                })
            });
            if (res.ok) {
                setDownloadSuccess(`Payment successful for Invoice ${paymentInvoice.invoice_number}`);
                setTimeout(() => setDownloadSuccess(''), 4000);
                setPaymentInvoice(null);
                loadInvoices();
                if (onRefreshParent) onRefreshParent();
            }
        } catch (err) {
            console.error('Failed to pay invoice:', err);
        } finally {
            setIsPaying(false);
        }
    };

    const loadInvoices = async () => {
        setLoading(true);
        try {
            // Client scoping: only fetch invoices for this client
            const params = new URLSearchParams();
            if (clientUser.name) params.set('client_name', clientUser.name);
            if (clientUser.client_id) params.set('client_id', clientUser.client_id);
            if (clientUser.id) params.set('client_user_id', clientUser.id);

            const res = await fetch(`/api/invoices?${params.toString()}`);
            const data = await res.json();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load client invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadProjects = async () => {
        try {
            const params = new URLSearchParams();
            if (clientUser.name) params.set('client_name', clientUser.name);
            if (clientUser.client_id) params.set('client_id', clientUser.client_id);
            if (clientUser.id) params.set('client_user_id', clientUser.id);

            const res = await fetch(`/api/projects?${params.toString()}`);
            const data = await res.json();
            setProjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load client projects:', err);
        }
    };

    useEffect(() => {
        loadInvoices();
        loadProjects();
    }, [clientUser]);

    // Handle 1-click official PDF download
    const handleDownloadPDF = async (inv) => {
        setDownloadingId(inv.id);
        setDownloadSuccess('');
        try {
            const res = await fetch(`/api/invoices/${inv.id}/pdf`);
            const data = await res.json();

            let pdfDataUri = data.pdfDataUri;
            if (!pdfDataUri && data.pdfBase64) {
                pdfDataUri = `data:application/pdf;base64,${data.pdfBase64}`;
            }

            if (pdfDataUri) {
                // Convert base64 / dataURI to downloadable Blob
                const byteCharacters = atob(pdfDataUri.split(',')[1] || data.pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = data.filename || `${inv.invoice_number || 'invoice'}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);

                setDownloadSuccess(`Downloaded ${data.filename || inv.invoice_number}`);
                setTimeout(() => setDownloadSuccess(''), 4000);
            }
        } catch (err) {
            console.error('Failed to download invoice PDF:', err);
        } finally {
            setDownloadingId(null);
        }
    };

    // Filter invoices by search query & status
    const filteredInvoices = invoices.filter(inv => {
        const matchSearch =
            (inv.invoice_number && inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (inv.project_name && inv.project_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchStatus =
            statusFilter === 'ALL' || (inv.status && inv.status.toUpperCase() === statusFilter.toUpperCase());
        return matchSearch && matchStatus;
    });

    // Calculate metrics
    const totalProjectBudget = projects.reduce((s, p) => s + (parseFloat(p.budget) || 0), 0);
    const totalInvoiced = invoices.reduce((s, inv) => s + (parseFloat(inv.total) || 0), 0);
    const totalPaid = invoices
        .filter(i => i.status === 'PAID')
        .reduce((s, inv) => s + (parseFloat(inv.total) || 0), 0);
    const remainingBalance = totalProjectBudget - totalPaid;

    return (
        <div className="space-y-6">
            {/* Metrics Summary Row - Project Balance Sheet */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Project Budget</p>
                        <p className="text-2xl font-black text-slate-900">${totalProjectBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Invoiced</p>
                        <p className="text-xl font-bold text-slate-900">${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settled & Paid</p>
                        <p className="text-xl font-bold text-emerald-700">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Balance</p>
                        <p className="text-xl font-bold text-amber-700">${remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {downloadSuccess && (
                <Alert type="success" title="PDF Download Complete" message={downloadSuccess} />
            )}

            {/* Main Invoices Table Card */}
            <Card
                title="🧾 Project Invoices & Deliverables"
                subtitle={`Showing official invoices issued for ${clientUser.name}`}
                action={
                    <Button variant="outline" size="sm" onClick={loadInvoices}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                }
            >
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 pt-1">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            placeholder="Search by invoice # or project..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
                        {['ALL', 'SENT', 'APPROVED', 'SUBMITTED', 'PAID'].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === st
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <div className="animate-spin w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
                        Loading project invoices...
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-14 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-700 mb-1">No Invoices Found</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            {searchTerm || statusFilter !== 'ALL'
                                ? 'No invoices match your current search or status filter.'
                                : 'Project invoices will appear here once all required milestones are approved by the Project Manager and sent by the Admin.'}
                        </p>
                    </div>
                ) : (
                    <Table headers={['Invoice #', 'Project Name', 'Invoice Date', 'Milestones / Items', 'Subtotal', 'Tax (18%)', 'Total Amount', 'Status', 'Actions']}>
                        {filteredInvoices.map(inv => {
                            const itemsCount = inv.items ? inv.items.length : 0;
                            return (
                                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 font-black text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            <span>{inv.invoice_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 text-sm">{inv.project_name || 'Project Deliverable'}</div>
                                        <div className="text-xs text-slate-500">{inv.client_name || clientUser.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {inv.invoice_date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs">
                                        <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                                            {itemsCount} {itemsCount === 1 ? 'Milestone' : 'Milestones'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                                        ${parseFloat(inv.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                        ${parseFloat(inv.tax || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 font-black text-blue-700 text-sm">
                                        ${parseFloat(inv.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={inv.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {inv.status === 'SENT' && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => { setPaymentInvoice(inv); setPaymentCurrency(inv.billing_currency || 'USD'); }}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" /> Pay
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedInvoice(inv)}
                                                title="View detailed milestone breakdown"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> View Invoice
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownloadPDF(inv)}
                                                loading={downloadingId === inv.id}
                                                title="Download official PDF document"
                                            >
                                                <Download className="w-3.5 h-3.5" /> PDF
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </Table>
                )}
            </Card>

            {/* Detailed View Invoice Modal */}
            {selectedInvoice && (
                <Modal
                    isOpen={!!selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    title={`Invoice ${selectedInvoice.invoice_number}`}
                    maxWidth="max-w-3xl"
                >
                    <div className="space-y-6 text-slate-800">
                        {/* Header section inside modal */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 p-5 rounded-2xl border border-slate-200">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-slate-900">{selectedInvoice.invoice_number}</span>
                                    <StatusBadge status={selectedInvoice.status} />
                                </div>
                                <p className="text-xs font-semibold text-slate-600 mt-1">
                                    Project: <span className="font-bold text-slate-900">{selectedInvoice.project_name}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Issued: <span className="font-medium text-slate-700">{selectedInvoice.invoice_date}</span> • Payment Terms: <span className="font-medium text-slate-700">Milestone Delivery Settlement</span>
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleDownloadPDF(selectedInvoice)}
                                loading={downloadingId === selectedInvoice.id}
                            >
                                <Download className="w-4 h-4" /> Download Official PDF
                            </Button>
                        </div>

                        {/* Parties Info Box */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-white rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                                    <Building className="w-3.5 h-3.5" /> Billed By (Vendor)
                                </div>
                                <p className="font-bold text-sm text-slate-900">VendorCorp Global</p>
                                <p className="text-xs text-slate-500 mt-0.5">Enterprise Contingent Workforce & Services</p>
                                <p className="text-xs text-slate-400 mt-0.5">Multi-Vendor Multi-Tenant Delivery</p>
                            </div>

                            <div className="p-4 bg-white rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                                    <Briefcase className="w-3.5 h-3.5" /> Billed To (Client)
                                </div>
                                <p className="font-bold text-sm text-slate-900">{selectedInvoice.client_name || clientUser.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Authorized Project Deliverables</p>
                                <p className="text-xs text-slate-400 mt-0.5">Project: {selectedInvoice.project_name}</p>
                            </div>
                        </div>

                        {/* Itemized Milestone Deliverables Table */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <FileCheck className="w-4 h-4 text-blue-600" /> Itemized Milestone Deliverables
                            </h4>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3"># Deliverable / Milestone Item</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3 text-right">Quantity</th>
                                            <th className="px-4 py-3 text-right">Rate</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                                            selectedInvoice.items.map((it, idx) => (
                                                <tr key={it.id || idx} className="hover:bg-slate-50/70">
                                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                                        {it.description || `Milestone Deliverable #${idx + 1}`}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 font-medium">
                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                                                            {it.type || 'MILESTONE'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                                                        {parseFloat(it.quantity || 1).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                                                        ${parseFloat(it.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                        ${parseFloat(it.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                                    Project milestone deliverable settlement
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="flex justify-end pt-2">
                            <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Milestone Subtotal:</span>
                                    <span className="font-semibold text-slate-900">${parseFloat(selectedInvoice.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Tax / GST (18%):</span>
                                    <span className="font-semibold text-slate-900">${parseFloat(selectedInvoice.tax || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                                    <span>Total Amount:</span>
                                    <span className="text-blue-700">${parseFloat(selectedInvoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Authenticated Deliverable Invoice
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(null)}>
                                    Close
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleDownloadPDF(selectedInvoice)}
                                    loading={downloadingId === selectedInvoice.id}
                                >
                                    <Download className="w-4 h-4" /> Download PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Payment Modal */}
            {paymentInvoice && (
                <Modal
                    isOpen={!!paymentInvoice}
                    onClose={() => setPaymentInvoice(null)}
                    title="Complete Invoice Payment"
                    maxWidth="max-w-md"
                >
                    <div className="space-y-5 text-slate-800">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                            <p className="text-sm font-semibold text-slate-600 mb-1">Invoice {paymentInvoice.invoice_number}</p>
                            <p className="text-3xl font-black text-slate-900">
                                {parseFloat(paymentInvoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-lg text-slate-500">{paymentInvoice.billing_currency || 'USD'}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Select Payment Currency</label>
                            <select 
                                value={paymentCurrency}
                                onChange={(e) => setPaymentCurrency(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                            >
                                {SUPPORTED_CURRENCIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {paymentCurrency !== (paymentInvoice.billing_currency || 'USD') && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-blue-800">Live Exchange Rate</p>
                                    <p className="text-sm text-blue-600 font-medium mt-0.5">
                                        1 {paymentInvoice.billing_currency || 'USD'} = {calculatingRate ? '...' : exchangeRate.toFixed(4)} {paymentCurrency}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-slate-200 pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-slate-700">Total to Pay:</span>
                                <span className="text-xl font-black text-emerald-600">
                                    {calculatingRate ? (
                                        <span className="text-sm animate-pulse text-slate-400">Calculating...</span>
                                    ) : (
                                        `${(parseFloat(paymentInvoice.total || 0) * exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${paymentCurrency}`
                                    )}
                                </span>
                            </div>

                            <Button 
                                variant="primary" 
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-base"
                                onClick={handlePayInvoice}
                                loading={isPaying || calculatingRate}
                            >
                                <CreditCard className="w-5 h-5 mr-2" /> Confirm Payment
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}