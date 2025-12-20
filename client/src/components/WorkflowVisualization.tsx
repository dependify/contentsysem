// Workflow Pipeline Visualization - 10-step agentic workflow
import { useState, useEffect } from 'react';
import {
    Brain, Search, FileText, PenTool, CheckCircle,
    Palette, Video, Image, Layout, Globe,
    Clock, AlertCircle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, Badge, Button, Spinner, ProgressBar } from '../components/ui';
import api from '../lib/api';

interface WorkflowStep {
    id: string;
    name: string;
    agent: string;
    status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
    duration_ms?: number;
    output?: any;
    error?: string;
    started_at?: string;
    completed_at?: string;
}

interface WorkflowVisualizationProps {
    contentId: number;
    onRefresh?: () => void;
}

const AGENT_ICONS: Record<string, any> = {
    nexus: Brain,
    vantage: Search,
    vertex: FileText,
    hemingway: PenTool,
    prism: CheckCircle,
    canvas: Palette,
    lens: Video,
    pixel: Image,
    mosaic: Layout,
    deployer: Globe,
};

const AGENT_COLORS: Record<string, string> = {
    nexus: 'text-purple-400 bg-purple-500/20',
    vantage: 'text-blue-400 bg-blue-500/20',
    vertex: 'text-cyan-400 bg-cyan-500/20',
    hemingway: 'text-orange-400 bg-orange-500/20',
    prism: 'text-green-400 bg-green-500/20',
    canvas: 'text-pink-400 bg-pink-500/20',
    lens: 'text-red-400 bg-red-500/20',
    pixel: 'text-yellow-400 bg-yellow-500/20',
    mosaic: 'text-indigo-400 bg-indigo-500/20',
    deployer: 'text-emerald-400 bg-emerald-500/20',
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
    nexus: 'Strategic planning & research questions',
    vantage: 'Deep research with web search',
    vertex: 'SEO architecture & content outlining',
    hemingway: 'Content writing',
    prism: 'Quality control & editing',
    canvas: 'Visual direction & image prompting',
    lens: 'Video curation',
    pixel: 'Image generation',
    mosaic: 'HTML assembly with multimedia',
    deployer: 'WordPress publishing',
};

export default function WorkflowVisualization({ contentId, onRefresh }: WorkflowVisualizationProps) {
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchWorkflowStatus = async () => {
        try {
            const response = await api.get(`/content/${contentId}/workflow`);
            if (response.data.success) {
                setSteps(response.data.steps);

                // Stop auto-refresh if all steps are complete or failed
                const allDone = response.data.steps.every(
                    (s: WorkflowStep) => s.status === 'complete' || s.status === 'failed' || s.status === 'skipped'
                );
                if (allDone) {
                    setAutoRefresh(false);
                }
            }
        } catch (error) {
            console.error('Failed to fetch workflow status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflowStatus();
    }, [contentId]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchWorkflowStatus, 3000);
        return () => clearInterval(interval);
    }, [autoRefresh, contentId]);

    const formatDuration = (ms?: number) => {
        if (!ms) return '—';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
    };

    const getStepProgress = () => {
        const completed = steps.filter(s => s.status === 'complete' || s.status === 'skipped').length;
        return (completed / steps.length) * 100;
    };

    const renderStepIcon = (step: WorkflowStep) => {
        const Icon = AGENT_ICONS[step.agent] || Brain;
        const colorClass = AGENT_COLORS[step.agent] || 'text-gray-400 bg-gray-500/20';

        if (step.status === 'running') {
            return (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass} animate-pulse`}>
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            );
        }

        if (step.status === 'failed') {
            return (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                </div>
            );
        }

        if (step.status === 'complete') {
            return (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <CheckCircle className="w-5 h-5" />
                </div>
            );
        }

        return (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-500">
                <Icon className="w-5 h-5" />
            </div>
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'complete':
                return <Badge variant="success">Complete</Badge>;
            case 'running':
                return <Badge variant="primary">Running</Badge>;
            case 'failed':
                return <Badge variant="error">Failed</Badge>;
            case 'skipped':
                return <Badge variant="gray">Skipped</Badge>;
            default:
                return <Badge variant="gray">Pending</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Progress Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Workflow Progress</h3>
                    <p className="text-gray-400 text-sm">
                        {steps.filter(s => s.status === 'complete').length} of {steps.length} steps complete
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {autoRefresh && (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            Live
                        </span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { fetchWorkflowStatus(); onRefresh?.(); }}>
                        Refresh
                    </Button>
                </div>
            </div>

            <ProgressBar value={getStepProgress()} />

            {/* Steps List */}
            <div className="space-y-2">
                {steps.map((step, index) => (
                    <Card
                        key={step.id}
                        className={`transition-all ${step.status === 'running' ? 'ring-2 ring-indigo-500' : ''}`}
                    >
                        <div
                            className="p-4 cursor-pointer"
                            onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                        >
                            <div className="flex items-center gap-4">
                                {/* Step Number & Icon */}
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-600 text-sm font-mono w-6">{index + 1}.</span>
                                    {renderStepIcon(step)}
                                </div>

                                {/* Step Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white capitalize">{step.agent}</span>
                                        {getStatusBadge(step.status)}
                                    </div>
                                    <p className="text-gray-400 text-sm">
                                        {AGENT_DESCRIPTIONS[step.agent] || step.name}
                                    </p>
                                </div>

                                {/* Duration */}
                                <div className="flex items-center gap-4 text-gray-400 text-sm">
                                    {step.duration_ms && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {formatDuration(step.duration_ms)}
                                        </span>
                                    )}
                                    {expandedStep === step.id ? (
                                        <ChevronUp size={16} />
                                    ) : (
                                        <ChevronDown size={16} />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedStep === step.id && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    {step.error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-3">
                                            <p className="text-red-300 text-sm font-mono">{step.error}</p>
                                        </div>
                                    )}

                                    {step.output && (
                                        <div className="space-y-2">
                                            <p className="text-gray-400 text-sm">Output Preview:</p>
                                            <pre className="p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto max-h-48">
                                                {typeof step.output === 'string'
                                                    ? step.output.substring(0, 500) + (step.output.length > 500 ? '...' : '')
                                                    : JSON.stringify(step.output, null, 2).substring(0, 500)}
                                            </pre>
                                        </div>
                                    )}

                                    {step.status === 'failed' && (
                                        <Button variant="secondary" size="sm" className="mt-3">
                                            Retry This Step
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
