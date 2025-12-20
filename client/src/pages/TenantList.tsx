// Tenant List View with Search & Filter
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, Plus, Building, Globe, Archive, ArchiveRestore,
    MoreVertical, Edit, Trash, CheckCircle, XCircle
} from 'lucide-react';
import {
    Button, Card, Badge, Dropdown, Spinner,
    Pagination, EmptyState, ConfirmDialog
} from '../components/ui';
import { useTenant } from '../context/TenantContext';

export default function TenantList() {
    const { tenants, loading, deleteTenant, restoreTenant, fetchTenants } = useTenant();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'created' | 'domain'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchTenants();
    }, []);

    const filteredTenants = useMemo(() => {
        let result = [...tenants];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.business_name.toLowerCase().includes(query) ||
                t.domain_url?.toLowerCase().includes(query) ||
                t.niche?.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (statusFilter === 'active') {
            result = result.filter(t => !t.archived);
        } else if (statusFilter === 'archived') {
            result = result.filter(t => t.archived);
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.business_name.localeCompare(b.business_name);
                    break;
                case 'domain':
                    comparison = (a.domain_url || '').localeCompare(b.domain_url || '');
                    break;
                case 'created':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [tenants, searchQuery, statusFilter, sortBy, sortOrder]);

    const paginatedTenants = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTenants.slice(start, start + itemsPerPage);
    }, [filteredTenants, currentPage]);

    const totalPages = Math.ceil(filteredTenants.length / itemsPerPage);

    const handleDelete = async () => {
        if (deleteTarget) {
            await deleteTenant(deleteTarget, true);
            setDeleteTarget(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tenants</h1>
                    <p className="text-gray-400">Manage your multi-tenant workspaces</p>
                </div>
                <Link to="/tenants/new">
                    <Button>
                        <Plus size={16} /> Add Tenant
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px] max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="input pl-10"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                        className="select"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="select"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="domain">Sort by Domain</option>
                        <option value="created">Sort by Created</option>
                    </select>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                </div>
            </div>

            {/* Tenant Grid */}
            {paginatedTenants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedTenants.map((tenant) => (
                        <Card key={tenant.id} className="hover:border-indigo-500/50 transition-colors">
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                            <Building className="text-indigo-400" size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{tenant.business_name}</h3>
                                            {tenant.domain_url && (
                                                <p className="text-gray-500 text-sm flex items-center gap-1">
                                                    <Globe size={12} />
                                                    {tenant.domain_url.replace(/^https?:\/\//, '')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <Dropdown
                                        trigger={
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical size={16} />
                                            </Button>
                                        }
                                        items={[
                                            { label: 'Edit', icon: <Edit size={14} />, onClick: () => window.location.href = `/tenants/${tenant.id}` },
                                            tenant.archived
                                                ? { label: 'Restore', icon: <ArchiveRestore size={14} />, onClick: () => restoreTenant(tenant.id) }
                                                : { label: 'Archive', icon: <Archive size={14} />, onClick: () => deleteTenant(tenant.id, false) },
                                            { label: 'Delete', icon: <Trash size={14} />, onClick: () => setDeleteTarget(tenant.id), danger: true },
                                        ]}
                                    />
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    {tenant.archived ? (
                                        <Badge variant="warning">Archived</Badge>
                                    ) : (
                                        <Badge variant="success">Active</Badge>
                                    )}
                                    {tenant.niche && (
                                        <Badge variant="gray">{tenant.niche}</Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        {tenant.wp_credentials?.url ? (
                                            <CheckCircle size={14} className="text-green-400" />
                                        ) : (
                                            <XCircle size={14} className="text-red-400" />
                                        )}
                                        WordPress
                                    </span>
                                    <span>
                                        Created {new Date(tenant.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<Building size={48} />}
                    title="No tenants found"
                    description={searchQuery ? "Try adjusting your search or filters" : "Get started by creating your first tenant"}
                    action={
                        !searchQuery && (
                            <Link to="/tenants/new">
                                <Button>
                                    <Plus size={16} /> Create Tenant
                                </Button>
                            </Link>
                        )
                    }
                />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Tenant"
                message="This will permanently delete this tenant and all associated content. This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
