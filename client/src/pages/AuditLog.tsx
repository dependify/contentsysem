// Audit Log Viewer for Admin
import { useState, useEffect } from 'react';
import {
    Activity, User, Settings, Shield, FileText, Trash,
    Filter, Search, RefreshCw, ChevronDown
} from 'lucide-react';
import {
    Card, CardContent, Button, Badge,
    Pagination, Spinner
} from '../components/ui';
import api from '../lib/api';

interface AuditLogEntry {
    id: number;
    user_id: number;
    user_email: string;
    action: string;
    resource_type: string;
    resource_id?: number;
    details?: any;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

const ACTION_ICONS: Record<string, any> = {
    login: User,
    logout: User,
    create: FileText,
    update: Settings,
    delete: Trash,
    admin: Shield,
};

const ACTION_COLORS: Record<string, string> = {
    login: 'bg-green-500/20 text-green-300',
    logout: 'bg-gray-500/20 text-gray-300',
    create: 'bg-blue-500/20 text-blue-300',
    update: 'bg-yellow-500/20 text-yellow-300',
    delete: 'bg-red-500/20 text-red-300',
    admin: 'bg-purple-500/20 text-purple-300',
};

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [resourceFilter, setResourceFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [expandedLog, setExpandedLog] = useState<number | null>(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params: any = { page: currentPage, limit: 20 };
            if (searchQuery) params.search = searchQuery;
            if (actionFilter) params.action = actionFilter;
            if (resourceFilter) params.resource = resourceFilter;
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;

            const response = await api.get('/admin/audit-logs', { params });
            if (response.data.success) {
                setLogs(response.data.logs);
                setTotalPages(response.data.totalPages || 1);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [currentPage, actionFilter, resourceFilter]);

    const handleSearch = () => {
        setCurrentPage(1);
        fetchLogs();
    };

    const clearFilters = () => {
        setSearchQuery('');
        setActionFilter('');
        setResourceFilter('');
        setDateFrom('');
        setDateTo('');
        setCurrentPage(1);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString(),
        };
    };

    const getActionLabel = (action: string) => {
        return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Audit Log</h1>
                    <p className="text-gray-400">Track all system activities and changes</p>
                </div>
                <Button onClick={fetchLogs} variant="ghost">
                    <RefreshCw size={16} /> Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-gray-500 mb-1">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search by user, action, or details..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="input pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Action</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="select"
                            >
                                <option value="">All Actions</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Resource</label>
                            <select
                                value={resourceFilter}
                                onChange={(e) => setResourceFilter(e.target.value)}
                                className="select"
                            >
                                <option value="">All Resources</option>
                                <option value="user">Users</option>
                                <option value="tenant">Tenants</option>
                                <option value="content">Content</option>
                                <option value="settings">Settings</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">From</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">To</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="input"
                            />
                        </div>

                        <Button onClick={handleSearch}>
                            <Filter size={16} /> Apply
                        </Button>
                        <Button variant="ghost" onClick={clearFilters}>
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Log Entries */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            ) : logs.length > 0 ? (
                <div className="space-y-2">
                    {logs.map((log) => {
                        const Icon = ACTION_ICONS[log.action.split('_')[0]] || Activity;
                        const colorClass = ACTION_COLORS[log.action.split('_')[0]] || 'bg-gray-500/20 text-gray-300';
                        const { date, time } = formatDate(log.created_at);
                        const isExpanded = expandedLog === log.id;

                        return (
                            <Card
                                key={log.id}
                                className="cursor-pointer hover:border-gray-600 transition-colors"
                                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            >
                                <div className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${colorClass}`}>
                                            <Icon size={18} />
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white">
                                                    {getActionLabel(log.action)}
                                                </span>
                                                {log.resource_type && (
                                                    <Badge variant="gray">{log.resource_type}</Badge>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                by {log.user_email}
                                            </div>
                                        </div>

                                        <div className="text-right text-sm text-gray-500">
                                            <div>{date}</div>
                                            <div>{time}</div>
                                        </div>

                                        <ChevronDown
                                            size={16}
                                            className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-gray-700 space-y-2 text-sm">
                                            {log.resource_id && (
                                                <div className="flex gap-2">
                                                    <span className="text-gray-500">Resource ID:</span>
                                                    <span className="text-gray-300">{log.resource_id}</span>
                                                </div>
                                            )}
                                            {log.ip_address && (
                                                <div className="flex gap-2">
                                                    <span className="text-gray-500">IP Address:</span>
                                                    <span className="text-gray-300">{log.ip_address}</span>
                                                </div>
                                            )}
                                            {log.details && (
                                                <div>
                                                    <span className="text-gray-500">Details:</span>
                                                    <pre className="mt-1 p-2 bg-gray-800 rounded text-xs overflow-x-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No audit logs found</h3>
                        <p className="text-gray-400">Try adjusting your filters or search criteria</p>
                    </CardContent>
                </Card>
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
        </div>
    );
}
