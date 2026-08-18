'use client';
import React, { useState, useMemo } from 'react';
import {
  Card,
  StatCard,
  Badge,
  StatusBadge,
  Table,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  Alert,
  EmptyState,
  LoadingSpinner
} from '../components/UI.js';
import {
  Building2,
  Users,
  Briefcase,
  DollarSign,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Building,
  ArrowRight,
  Filter,
  CheckCircle2,
  LayoutGrid,
  List
} from 'lucide-react';

const INDUSTRY_OPTIONS = [
  { value: 'Financial Services', label: 'Financial Services & Banking' },
  { value: 'Healthcare & Biotech', label: 'Healthcare & Biotech' },
  { value: 'Supply Chain & Logistics', label: 'Supply Chain & Logistics' },
  { value: 'Retail & E-commerce', label: 'Retail & E-commerce' },
  { value: 'Technology & SaaS', label: 'Technology & SaaS' },
  { value: 'Telecommunications', label: 'Telecommunications' },
  { value: 'Energy & Utilities', label: 'Energy & Utilities' },
  { value: 'Government & Public Sector', label: 'Government & Public Sector' },
  { value: 'Other', label: 'Other Industry' },
];

export default function AdminClients({ clients = [], projects = [], onRefresh, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    industry: 'Technology & SaaS',
    address: '',
    status: 'ACTIVE'
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // 1. Process and enrich clients with live project metadata
  const enrichedClients = useMemo(() => {
    const clientList = Array.isArray(clients) ? clients : [];
    const projectList = Array.isArray(projects) ? projects : [];

    return clientList.map(client => {
      // Match projects by client_id or client_name
      const relatedProjects = projectList.filter(
        p => (p.client_id && Number(p.client_id) === Number(client.id)) ||
             (p.client_name && p.client_name.toLowerCase().trim() === client.name.toLowerCase().trim())
      );

      const activeProjectsCount = relatedProjects.filter(p => p.status === 'ACTIVE').length;
      const totalBudget = relatedProjects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);

      return {
        ...client,
        projects: relatedProjects,
        project_count: relatedProjects.length,
        active_project_count: activeProjectsCount,
        total_budget: totalBudget
      };
    });
  }, [clients, projects]);

  // 2. Filter clients based on search & status
  const filteredClients = useMemo(() => {
    return enrichedClients.filter(c => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(query)) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(query)) ||
        (c.industry && c.industry.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [enrichedClients, statusFilter, searchQuery]);

  // Metric summaries
  const totalClientsCount = enrichedClients.length;
  const activeClientsCount = enrichedClients.filter(c => c.status === 'ACTIVE').length;
  const totalManagedBudget = enrichedClients.reduce((acc, c) => acc + c.total_budget, 0);
  const totalClientProjects = enrichedClients.reduce((acc, c) => acc + c.project_count, 0);

  // Handlers
  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      industry: 'Technology & SaaS',
      address: '',
      status: 'ACTIVE'
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      contact_person: client.contact_person || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      industry: client.industry || 'Technology & SaaS',
      address: client.address || '',
      status: client.status || 'ACTIVE'
    });
    setFormError('');
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const isEdit = !!editingClient;
      const url = isEdit ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save client details.');
        return;
      }

      setIsCreateModalOpen(false);
      setEditingClient(null);
      setActionSuccess(isEdit ? `Client "${data.name}" updated successfully.` : `Client "${data.name}" added successfully.`);
      setTimeout(() => setActionSuccess(''), 4000);

      if (onRefresh) onRefresh();
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    setDeleteError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/clients/${deletingClient.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete client.');
        return;
      }

      const deletedName = deletingClient.name;
      setDeletingClient(null);
      setActionSuccess(`Client "${deletedName}" has been deleted.`);
      setTimeout(() => setActionSuccess(''), 4000);

      if (onRefresh) onRefresh();
    } catch (err) {
      setDeleteError('Network error. Could not delete client.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30">
              Client Management
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Client Organizations</h2>
          <p className="text-sky-200 text-sm mt-1">
            Maintain client accounts, enterprise contacts, assigned project budgets, and delivery status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className="bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-950/40"
          >
            <Plus className="w-4 h-4" /> Add New Client
          </Button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <Alert type="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clients"
          value={totalClientsCount}
          icon={Building2}
          color="brand"
          change="Registered organizations"
        />
        <StatCard
          label="Active Accounts"
          value={activeClientsCount}
          icon={ShieldCheck}
          color="emerald"
          change={`${totalClientsCount - activeClientsCount} inactive accounts`}
        />
        <StatCard
          label="Managed Projects"
          value={totalClientProjects}
          icon={Briefcase}
          color="indigo"
          change="Linked client engagements"
        />
        <StatCard
          label="Total Portfolio Value"
          value={`$${totalManagedBudget.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="amber"
          change="Combined project budgets"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client, contact, email or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter & View Mode Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              All ({totalClientsCount})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-md transition-all ${statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Active ({activeClientsCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-md transition-all ${statusFilter === 'INACTIVE' ? 'bg-white text-slate-700 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Inactive ({totalClientsCount - activeClientsCount})
            </button>
          </div>

          {/* Grid / Table View Toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Grid or Table View */}
      {filteredClients.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title={searchQuery || statusFilter !== 'ALL' ? 'No clients match your filter' : 'No clients registered yet'}
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search keywords or resetting filters.'
                : 'Click "Add New Client" above to create your first client organization.'
            }
          />
        </Card>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const initial = (client.name || 'C').charAt(0).toUpperCase();
            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-50/70 to-transparent">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-sky-900/20 shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-base leading-tight truncate group-hover:text-sky-600 transition-colors">
                          {client.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          {client.industry || 'Enterprise Client'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={client.status} />
                  </div>

                  {/* Contact Info Body */}
                  <div className="p-5 space-y-2.5 text-xs text-slate-600">
                    {client.contact_person && (
                      <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.contact_person}</span>
                      </div>
                    )}
                    {client.contact_email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <a
                          href={`mailto:${client.contact_email}`}
                          className="hover:text-sky-600 hover:underline truncate"
                        >
                          {client.contact_email}
                        </a>
                      </div>
                    )}
                    {client.contact_phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.contact_phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2 text-slate-500 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Portfolio Summary Strip & Actions Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Active Projects</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {client.active_project_count} / {client.project_count}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block font-medium">Total Budget</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        ${client.total_budget.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    {onNavigate ? (
                      <button
                        onClick={() => onNavigate('projects')}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1 transition-colors"
                      >
                        Projects <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(client)}
                        className="px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                        title="Edit Client"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeletingClient(client);
                          setDeleteError('');
                        }}
                        className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        title="Delete Client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card>
          <Table
            headers={[
              'Client Name',
              'Industry',
              'Contact Person',
              'Email & Phone',
              'Projects',
              'Total Budget',
              'Status',
              'Actions'
            ]}
          >
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-xs shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <div>{client.name}</div>
                      {client.address && <div className="text-xs text-slate-400 font-normal truncate max-w-xs">{client.address}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                  <Badge variant="indigo" size="sm">{client.industry || 'Technology'}</Badge>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">
                  {client.contact_person || <span className="text-slate-400 text-xs">—</span>}
                </td>
                <td className="px-6 py-4 text-xs">
                  {client.contact_email ? (
                    <div className="text-sky-600">{client.contact_email}</div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                  {client.contact_phone && (
                    <div className="text-slate-500 text-[11px] mt-0.5">{client.contact_phone}</div>
                  )}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-700">
                  {client.project_count} project{client.project_count !== 1 ? 's' : ''}
                </td>
                <td className="px-6 py-4 font-bold text-emerald-700">
                  ${client.total_budget.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(client)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Client"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingClient(client);
                        setDeleteError('');
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* ── CREATE / EDIT CLIENT MODAL ── */}
      <Modal
        isOpen={isCreateModalOpen || !!editingClient}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingClient(null);
        }}
        title={editingClient ? `Edit Client: ${editingClient.name}` : 'Add New Client Organization'}
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          {formError && (
            <Alert type="danger" title="Error">
              {formError}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Client Organization Name *"
                required
                placeholder="e.g. Apex Financial Services"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <Select
              label="Industry Vertical"
              options={INDUSTRY_OPTIONS}
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            />

            <Select
              label="Account Status"
              options={[
                { value: 'ACTIVE', label: 'Active Account' },
                { value: 'INACTIVE', label: 'Inactive / Suspended' }
              ]}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />

            <Input
              label="Primary Contact Person"
              placeholder="e.g. Robert Sterling"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />

            <Input
              label="Contact Email Address"
              type="email"
              placeholder="e.g. r.sterling@apexfinancial.com"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            />

            <div className="sm:col-span-2">
              <Input
                label="Contact Phone Number"
                type="tel"
                placeholder="e.g. +1 (555) 234-5678"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <Textarea
                label="Billing / Office Address"
                placeholder="e.g. 100 Wall Street, Suite 400, New York, NY 10005"
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingClient(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingClient ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <Modal
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        title="Delete Client Organization"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {deleteError ? (
            <Alert type="danger" title="Cannot Delete Client">
              {deleteError}
            </Alert>
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete client{' '}
              <strong className="text-slate-900 font-bold">"{deletingClient?.name}"</strong>?
              This action cannot be undone.
            </p>
          )}

          {deletingClient?.active_project_count > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <p className="font-bold">⚠️ Active Projects Warning</p>
              <p>
                This client currently has {deletingClient.active_project_count} active project(s) assigned.
                Active clients cannot be deleted until all projects are completed or reallocated.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setDeletingClient(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              loading={submitting}
              onClick={handleDeleteClient}
            >
              Delete Client
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
