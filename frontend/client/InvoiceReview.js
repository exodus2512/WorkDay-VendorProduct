'use client';
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, StatusBadge, Modal, Alert } from '../components/UI.js';
import {
    Receipt, Download, CheckCircle2, Clock, XCircle, CreditCard, DollarSign,
    FileCheck, Shield, Building, Briefcase, ChevronDown, ChevronUp, ArrowRight,
    Sparkles, BarChart3, RefreshCw
} from 'lucide-react';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'JPY', 'AED', 'MYR'];

// Step tracker for the payment flow
function StepIndicator({ step }) {
    const steps = ['Review Milestones', 'Approve Invoice', 'Make Payment'];
    return (
        <div className="flex items-center gap-0 mb-8">
            {steps.map((label, i) => {
                const idx = i + 1;
                const isActive = step === idx;
                const isDone = step > idx;
                return (
                    <React.Fragment key={i}>
                        <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : isActive ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-400'}`}>
                                {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx}
                            </div>
                            <span className={`text-xs font-bold whitespace-nowrap ${isActive ? 'text-blue-600' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mb-5 transition-all ${step > idx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default function ClientInvoiceReview({ clientUser, onRefreshParent }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [loadingMilestones, setLoadingMilestones] = useState(false);
    const [reviewStep, setReviewStep] = useState(1); // 1=milestones, 2=approve, 3=payment
    const [downloadingId, setDownloadingId] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Payment states
    const [paymentCurrency, setPaymentCurrency] = useState('USD');
    const [exchangeRate, setExchangeRate] = useState(1);
    const [calculatingRate, setCalculatingRate] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [approving, setApproving] = useState(false);

    // ── Load SENT invoices for this client ──────────────────────────────────
    const loadInvoices = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (clientUser?.name) params.set('client_name', clientUser.name);
            if (clientUser?.client_id) params.set('client_id', clientUser.client_id);
            if (clientUser?.id) params.set('client_user_id', clientUser.id);
            const res = await fetch(`/api/invoices?${params.toString()}`);
            const data = await res.json();
            // Only show invoices that need attention (SENT or APPROVED)
            const actionable = Array.isArray(data) ? data.filter(inv => ['SENT', 'APPROVED'].includes(inv.status)) : [];
            setInvoices(actionable);
        } catch (err) {
            console.error('Failed to load invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadInvoices(); }, [clientUser]);

    // ── Load milestones for the invoice's project ───────────────────────────
    const loadMilestones = async (projectId) => {
        setLoadingMilestones(true);
        try {
            const res = await fetch(`/api/milestones?project_id=${projectId}`);
            const data = await res.json();
            setMilestones(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load milestones:', err);
        } finally {
            setLoadingMilestones(false);
        }
    };

    // ── Live exchange rate ───────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedInvoice || reviewStep !== 3) return;
        const billingCurrency = selectedInvoice.billing_currency || 'USD';
        if (paymentCurrency === billingCurrency) { setExchangeRate(1); return; }
        const fetchRate = async () => {
            setCalculatingRate(true);
            try {
                const res = await fetch(`/api/exchange-rate?from=${billingCurrency}&to=${paymentCurrency}`);
                const d = await res.json();
                if (d.rate) setExchangeRate(d.rate);
            } catch { }
            finally { setCalculatingRate(false); }
        };
        fetchRate();
    }, [paymentCurrency, selectedInvoice, reviewStep]);

    // ── Open the review modal for an invoice ────────────────────────────────
    const openReview = async (inv) => {
        setSelectedInvoice(inv);
        setReviewStep(1);
        setPaymentCurrency(inv.billing_currency || 'USD');
        setExchangeRate(1);
        if (inv.project_id) await loadMilestones(inv.project_id);
    };

    // ── Step 2: Approve (SENT → APPROVED) ───────────────────────────────────
    const handleApprove = async () => {
        setApproving(true);
        try {
            const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'APPROVED' })
            });
            if (res.ok) {
                const updated = await res.json();
                setSelectedInvoice(updated);
                setReviewStep(3);
                loadInvoices();
            }
        } catch (err) {
            console.error('Failed to approve invoice:', err);
        } finally {
            setApproving(false);
        }
    };

    // ── Step 3: Pay ─────────────────────────────────────────────────────────
    const handlePay = async () => {
        setIsPaying(true);
        try {
            const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PAID', payment_currency: paymentCurrency, payment_exchange_rate: exchangeRate })
            });
            if (res.ok) {
                setSuccessMsg(`🎉 Payment confirmed for Invoice ${selectedInvoice.invoice_number}!`);
                setSelectedInvoice(null);
                loadInvoices();
                if (onRefreshParent) onRefreshParent();
                setTimeout(() => setSuccessMsg(''), 5000);
            }
        } catch (err) {
            console.error('Failed to pay invoice:', err);
        } finally {
            setIsPaying(false);
        }
    };

    // ── Download PDF ─────────────────────────────────────────────────────────
    const handleDownloadPDF = async (inv) => {
        setDownloadingId(inv.id);
        try {
            const res = await fetch(`/api/invoices/${inv.id}/pdf`);
            const data = await res.json();
            let pdfDataUri = data.pdfDataUri;
            if (!pdfDataUri && data.pdfBase64) pdfDataUri = `data:application/pdf;base64,${data.pdfBase64}`;
            if (pdfDataUri) {
                const byteCharacters = atob(pdfDataUri.split(',')[1] || data.pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = data.filename || `${inv.invoice_number}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error('PDF download failed:', err);
        } finally {
            setDownloadingId(null);
        }
    };

    const totalDue = selectedInvoice ? parseFloat(selectedInvoice.total || 0) * exchangeRate : 0;
    const billingCurrency = selectedInvoice?.billing_currency || 'USD';

    return (
        <div className="space-y-6">
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-semibold text-sm shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    {successMsg}
                </div>
            )}

            {/* Invoice Cards */}
            <Card
                title="📋 Project Invoices Awaiting Review"
                subtitle="Review completed milestone deliverables, approve the invoice, and proceed to payment."
                action={
                    <Button variant="outline" size="sm" onClick={loadInvoices}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                }
            >
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <div className="animate-spin w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
                        Loading invoices...
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-700 mb-1">No Pending Invoices</h3>
                        <p className="text-xs text-slate-500">All invoices have been settled. New ones will appear here once sent by the vendor.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {invoices.map(inv => (
                            <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${inv.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            <Receipt className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-slate-900 text-base">{inv.invoice_number}</span>
                                                <StatusBadge status={inv.status} />
                                            </div>
                                            <p className="text-sm text-slate-600 mt-0.5 font-medium">{inv.project_name}</p>
                                            <p className="text-xs text-slate-400">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 font-semibold uppercase">Amount Due</p>
                                            <p className="text-xl font-black text-blue-700">${parseFloat(inv.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.billing_currency || 'USD'}</p>
                                        </div>
                                        <Button
                                            variant="primary"
                                            size="md"
                                            onClick={() => openReview(inv)}
                                        >
                                            {inv.status === 'APPROVED' ? <CreditCard className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            {inv.status === 'APPROVED' ? 'Pay Now' : 'Review & Approve'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Invoice Items Summary */}
                                {inv.items && inv.items.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <div className="flex flex-wrap gap-2">
                                            {inv.items.map((item, i) => (
                                                <span key={i} className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-100">
                                                    {item.description}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Full Review Modal */}
            {selectedInvoice && (
                <Modal
                    isOpen={!!selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    title={`Review Invoice ${selectedInvoice.invoice_number}`}
                    maxWidth="max-w-3xl"
                >
                    <div className="space-y-6">
                        <StepIndicator step={reviewStep} />

                        {/* ── STEP 1: Milestone Completion Review ──────── */}
                        {reviewStep === 1 && (
                            <div className="space-y-5">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                        <FileCheck className="w-4 h-4" /> Milestone Completion Verification
                                    </p>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Please verify all milestones below have been completed to your satisfaction before approving the invoice.
                                    </p>
                                </div>

                                {loadingMilestones ? (
                                    <div className="py-8 text-center text-slate-400">
                                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                                        Loading milestones...
                                    </div>
                                ) : milestones.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400">
                                        <p className="text-sm">No milestone records found for this project.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {milestones.map(ms => {
                                            const isCompleted = ms.status === 'APPROVED' || ms.status === 'COMPLETED';
                                            return (
                                                <div key={ms.id} className={`p-4 rounded-xl border ${isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            {isCompleted ? (
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                            ) : (
                                                                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                            )}
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{ms.name}</p>
                                                                {ms.description && <p className="text-xs text-slate-600 mt-0.5">{ms.description}</p>}
                                                                {ms.evidence && (
                                                                    <a href={ms.evidence} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                                                                        📎 View Evidence / Deliverable
                                                                    </a>
                                                                )}
                                                                <p className="text-xs text-slate-400 mt-1">Due: {ms.due_date ? new Date(ms.due_date).toLocaleDateString() : '—'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="font-black text-emerald-700 text-sm">${parseFloat(ms.amount || 0).toLocaleString()}</p>
                                                            <StatusBadge status={ms.status} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Invoice line-item summary */}
                                <div className="mt-2 border-t border-slate-100 pt-4">
                                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-wider flex items-center gap-1.5">
                                        <BarChart3 className="w-4 h-4 text-blue-500" /> Invoice Breakdown
                                    </h4>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100 text-xs uppercase text-slate-600 font-bold">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">Deliverable</th>
                                                    <th className="px-4 py-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedInvoice.items?.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-3 text-slate-700">{item.description}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">${parseFloat(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-500">Subtotal</td>
                                                    <td className="px-4 py-3 text-right text-slate-700 font-semibold">${parseFloat(selectedInvoice.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                                <tr className="bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-500">Tax / GST (18%)</td>
                                                    <td className="px-4 py-3 text-right text-slate-700 font-semibold">${parseFloat(selectedInvoice.tax || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                                <tr className="bg-blue-50">
                                                    <td className="px-4 py-3 font-black text-slate-900">TOTAL DUE</td>
                                                    <td className="px-4 py-3 text-right font-black text-blue-700 text-base">${parseFloat(selectedInvoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {billingCurrency}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-2">
                                    <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(selectedInvoice)} loading={downloadingId === selectedInvoice.id}>
                                        <Download className="w-4 h-4" /> Download PDF
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={() => {
                                            if (selectedInvoice.status === 'APPROVED') setReviewStep(3);
                                            else setReviewStep(2);
                                        }}
                                    >
                                        Proceed to {selectedInvoice.status === 'APPROVED' ? 'Payment' : 'Approve'} <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 2: Approve Invoice ──────────────────── */}
                        {reviewStep === 2 && (
                            <div className="space-y-5">
                                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Shield className="w-6 h-6 text-amber-600" />
                                        <p className="font-bold text-amber-900 text-base">Confirm Invoice Approval</p>
                                    </div>
                                    <p className="text-sm text-amber-800">
                                        By approving this invoice, you confirm that all milestones have been delivered satisfactorily
                                        and authorize payment of the amount below.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Invoice</p>
                                        <p className="font-black text-slate-900">{selectedInvoice.invoice_number}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Project</p>
                                        <p className="font-bold text-slate-900 text-sm">{selectedInvoice.project_name}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Total Amount</p>
                                        <p className="font-black text-blue-700 text-lg">${parseFloat(selectedInvoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {billingCurrency}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Milestones Completed</p>
                                        <p className="font-black text-emerald-700 text-lg">{milestones.filter(m => m.status === 'APPROVED' || m.status === 'COMPLETED').length} / {milestones.length}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-2">
                                    <Button variant="outline" onClick={() => setReviewStep(1)}>&larr; Back</Button>
                                    <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove} loading={approving}>
                                        <CheckCircle2 className="w-4 h-4" /> Approve Invoice
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 3: Payment ──────────────────────────── */}
                        {reviewStep === 3 && (
                            <div className="space-y-5">
                                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="font-bold text-emerald-900">Invoice Approved ✓</p>
                                        <p className="text-xs text-emerald-700">Select your payment currency and confirm to complete settlement.</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                    <p className="text-sm font-semibold text-slate-500 mb-1">Amount Due (Invoice Currency)</p>
                                    <p className="text-3xl font-black text-slate-900">${parseFloat(selectedInvoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xl text-slate-400">{billingCurrency}</span></p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Payment Currency</label>
                                    <select
                                        value={paymentCurrency}
                                        onChange={e => setPaymentCurrency(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                                    >
                                        {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                {paymentCurrency !== billingCurrency && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <p className="text-xs font-bold text-blue-800">Live Exchange Rate</p>
                                        <p className="text-sm text-blue-600 mt-0.5">
                                            {calculatingRate ? '⏳ Fetching live rate...' : `1 ${billingCurrency} = ${exchangeRate.toFixed(4)} ${paymentCurrency}`}
                                        </p>
                                    </div>
                                )}

                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-700">Total to Pay:</span>
                                        <span className="text-2xl font-black text-emerald-600">
                                            {calculatingRate ? <span className="text-sm animate-pulse text-slate-400">Calculating...</span> : `${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${paymentCurrency}`}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-2">
                                    <Button variant="outline" onClick={() => setReviewStep(selectedInvoice.status === 'APPROVED' ? 1 : 2)}>&larr; Back</Button>
                                    <Button
                                        variant="primary"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-base"
                                        onClick={handlePay}
                                        loading={isPaying || calculatingRate}
                                    >
                                        <CreditCard className="w-5 h-5" /> Confirm Payment
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}

// Alias for Eye icon since it's not imported at top
function Eye({ className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
