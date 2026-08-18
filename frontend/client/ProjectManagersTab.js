'use client';
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, StatusBadge, Modal, Alert, Input } from '../components/UI.js';
import { Users, Plus } from 'lucide-react';

export default function ProjectManagersTab({ clientUser }) {
    const [pms, setPms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadPms = async () => {
        setLoading(true);
        try {
            const vendorId = clientUser.vendor_id || 1;
            const res = await fetch(`/api/employees?role=PROJECT_MANAGER&vendor_id=${vendorId}`);
            const data = await res.json();
            // Filter by client_id if available to show only this client's PMs,
            // or just show them if they are associated. For demo, we filter by client_id.
            const userClientId = clientUser?.client_id || 1;
            const filtered = Array.isArray(data)
                ? data.filter(pm => !pm.client_id || Number(pm.client_id) === Number(userClientId))
                : [];
            setPms(filtered);
        } catch (err) {
            console.error('Failed to load PMs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientUser) loadPms();
    }, [clientUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setSubmitSuccess('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    role: 'PROJECT_MANAGER',
                    vendor_id: clientUser?.vendor_id || 1,
                    client_id: clientUser?.client_id || 1
                })
            });

            if (!res.ok) {
                const err = await res.json();
                setSubmitError(err.error || 'Failed to create Project Manager.');
                setSubmitting(false);
                return;
            }

            setSubmitSuccess('Project Manager created successfully!');
            setForm({ name: '', email: '', password: '' });
            setShowForm(false);
            loadPms();
        } catch (err) {
            setSubmitError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card
                title="👥 Client Project Managers"
                subtitle="Manage Project Managers dedicated to your projects"
                action={
                    <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Add Project Manager
                    </Button>
                }
            >
                {submitSuccess && <Alert type="success" title="Success" message={submitSuccess} className="mb-4" />}
                
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <div className="animate-spin w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
                        Loading project managers...
                    </div>
                ) : pms.length === 0 ? (
                    <div className="text-center py-14 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-700 mb-1">No Project Managers</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                            You haven't added any Project Managers yet. Add one to manage your project deliverables.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-1" /> Add Project Manager
                        </Button>
                    </div>
                ) : (
                    <Table headers={['Name', 'Email', 'Role', 'Status']}>
                        {pms.map(pm => (
                            <tr key={pm.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">{pm.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{pm.email}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-violet-100 text-violet-700">
                                        Project Manager
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={pm.status} />
                                </td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>

            {showForm && (
                <Modal
                    isOpen={showForm}
                    onClose={() => setShowForm(false)}
                    title="Add Project Manager"
                    maxWidth="max-w-md"
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {submitError && <Alert type="error" title="Error" message={submitError} />}
                        
                        <Input
                            label="Full Name *"
                            required
                            placeholder="e.g. Jane Doe"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <Input
                            label="Email Address *"
                            type="email"
                            required
                            placeholder="jane@clientcorp.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                        <Input
                            label="Temporary Password *"
                            type="password"
                            required
                            placeholder="Min 8 characters"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" loading={submitting}>
                                Create Project Manager
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
