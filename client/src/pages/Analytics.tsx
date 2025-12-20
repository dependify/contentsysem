import { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, DollarSign,
    Cpu, FileText, RefreshCw
} from 'lucide-react';
import { Button, Card, Badge, Spinner, StatCard, ProgressBar, Tabs } from '../components/ui';
import { useTenant } from '../context/TenantContext';
import { format, subDays } from 'date-fns';
import api from '../lib/api';

interface TokenUsage {
    period: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    content_count: number;
}

interface AgentBreakdown {
    agent_name: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
}

interface ContentCost {
    id: number;
    title: string;
    status: string;
    created_at: string;
    total_cost: string;
    total_tokens: number;
}

export default function Analytics() {
    const { currentTenant, tenants } = useTenant();
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState('30');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Data states
    const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([]);
    const [agentBreakdown, setAgentBreakdown] = useState<AgentBreakdown[]>([]);
    const [contentCosts, setContentCosts] = useState<ContentCost[]>([]);
    const [totals, setTotals] = useState({
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost_usd: '0.000000',
        content_count: 0,
        avg_cost: '0.000000',
    });

    const tenantId = selectedTenantId || currentTenant?.id;

    const fetchAnalytics = async () => {
        if (!tenantId) return;

        try {
            setLoading(true);
            const fromDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
            const toDate = format(new Date(), 'yyyy-MM-dd');

            // Fetch token usage
            const tokenResponse = await api.get(`/analytics/tokens/${tenantId}`, {
                params: { from_date: fromDate, to_date: toDate }
            });

            if (tokenResponse.data.success) {
                setTokenUsage(tokenResponse.data.usage_by_period);
                setAgentBreakdown(tokenResponse.data.usage_by_agent);
                setTotals({
                    ...totals,
                    ...tokenResponse.data.totals,
                });
            }

            // Fetch cost breakdown
            const costResponse = await api.get(`/analytics/costs/${tenantId}`, {
                params: { from_date: fromDate, to_date: toDate }
            });

            if (costResponse.data.success) {
                setContentCosts(costResponse.data.content_costs);
                setTotals(prev => ({
                    ...prev,
                    content_count: costResponse.data.summary.content_count,
                    avg_cost: costResponse.data.summary.average_cost_per_content,
                }));
            }

        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [tenantId, dateRange]);

    // Simple bar chart using divs
    const renderTokenChart = () => {
        const maxTokens = Math.max(...tokenUsage.map(u => u.input_tokens + u.output_tokens), 1);

        return (
            <div className="space-y-2">
                {tokenUsage.slice(-14).map((usage, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="w-20 text-xs text-gray-500 text-right">
                            {format(new Date(usage.period), 'MMM d')}
                        </div>
                        <div className="flex-1 flex gap-1 h-6">
                            <div
                                className="bg-indigo-500 rounded-l"
                                style={{ width: `${(usage.input_tokens / maxTokens) * 50}%` }}
                                title={`Input: ${usage.input_tokens.toLocaleString()}`}
                            />
                            <div
                                className="bg-purple-500 rounded-r"
                                style={{ width: `${(usage.output_tokens / maxTokens) * 50}%` }}
                                title={`Output: ${usage.output_tokens.toLocaleString()}`}
                            />
                        </div>
                        <div className="w-24 text-xs text-gray-400 text-right">
                            {(usage.input_tokens + usage.output_tokens).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderAgentBreakdown = () => {
        const totalCost = agentBreakdown.reduce((acc, a) => acc + parseFloat(String(a.cost_usd ?? '0')), 0);

        return (
            <div className="space-y-3">
                {agentBreakdown.map((agent, i) => {
                    const percentage = totalCost > 0 ? (parseFloat(String(agent.cost_usd) || '0') / totalCost) * 100 : 0;
                    return (
                        <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300 capitalize">{agent.agent_name}</span>
                                <span className="text-gray-400">
                                    ${parseFloat(String(agent.cost_usd) || '0').toFixed(4)} ({percentage.toFixed(1)}%)
                                </span>
                            </div>
                            <ProgressBar value={percentage} max={100} />
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!tenantId && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <BarChart3 className="w-16 h-16 text-gray-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">Select a Tenant</h2>
                <p className="text-gray-500">Choose a tenant to view analytics data</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics</h1>
                    <p className="text-gray-400">Token usage, costs, and performance metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="select w-48"
                        value={selectedTenantId || currentTenant?.id || ''}
                        onChange={(e) => setSelectedTenantId(parseInt(e.target.value))}
                    >
                        {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.business_name}</option>
                        ))}
                    </select>
                    <select
                        className="select w-40"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={fetchAnalytics}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            ) : (
                <>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Total Tokens"
                            value={totals.total_tokens.toLocaleString()}
                            icon={<Cpu className="w-8 h-8" />}
                        />
                        <StatCard
                            label="Total Cost"
                            value={`$${parseFloat(totals.cost_usd).toFixed(4)}`}
                            icon={<DollarSign className="w-8 h-8" />}
                        />
                        <StatCard
                            label="Content Generated"
                            value={totals.content_count.toString()}
                            icon={<FileText className="w-8 h-8" />}
                        />
                        <StatCard
                            label="Avg Cost/Content"
                            value={`$${parseFloat(totals.avg_cost).toFixed(4)}`}
                            icon={<TrendingUp className="w-8 h-8" />}
                        />
                    </div>

                    {/* Tabs */}
                    <Tabs
                        tabs={[
                            { id: 'overview', label: 'Token Usage', icon: <BarChart3 size={16} /> },
                            { id: 'agents', label: 'By Agent', icon: <Cpu size={16} /> },
                            { id: 'content', label: 'By Content', icon: <FileText size={16} /> },
                        ]}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />

                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Daily Token Usage</h3>
                                <div className="flex items-center gap-4 mb-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-indigo-500 rounded" />
                                        <span className="text-gray-400">Input Tokens</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-purple-500 rounded" />
                                        <span className="text-gray-400">Output Tokens</span>
                                    </div>
                                </div>
                                {tokenUsage.length > 0 ? renderTokenChart() : (
                                    <p className="text-gray-500 text-center py-8">No data available</p>
                                )}
                            </Card>

                            <Card className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Token Summary</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-gray-700">
                                        <span className="text-gray-400">Input Tokens</span>
                                        <span className="text-white font-medium">{totals.input_tokens.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-700">
                                        <span className="text-gray-400">Output Tokens</span>
                                        <span className="text-white font-medium">{totals.output_tokens.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-gray-700">
                                        <span className="text-gray-400">Total Tokens</span>
                                        <span className="text-white font-medium">{totals.total_tokens.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-3">
                                        <span className="text-gray-400">Estimated Cost</span>
                                        <span className="text-green-400 font-medium">${parseFloat(totals.cost_usd).toFixed(6)}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'agents' && (
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Cost by Agent</h3>
                            {agentBreakdown.length > 0 ? renderAgentBreakdown() : (
                                <p className="text-gray-500 text-center py-8">No agent data available</p>
                            )}
                        </Card>
                    )}

                    {activeTab === 'content' && (
                        <Card>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Content</th>
                                        <th>Status</th>
                                        <th>Tokens</th>
                                        <th>Cost</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contentCosts.length > 0 ? (
                                        contentCosts.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <p className="font-medium text-white truncate max-w-xs">{item.title}</p>
                                                </td>
                                                <td>
                                                    <Badge variant={
                                                        item.status === 'complete' ? 'success' :
                                                            item.status === 'failed' ? 'error' : 'gray'
                                                    }>
                                                        {item.status}
                                                    </Badge>
                                                </td>
                                                <td className="text-gray-300">{item.total_tokens.toLocaleString()}</td>
                                                <td className="text-green-400">${item.total_cost}</td>
                                                <td className="text-gray-400">
                                                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="text-center text-gray-500 py-8">
                                                No content data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
