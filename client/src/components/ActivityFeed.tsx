// Real-time Activity Feed for Analytics
import { useState, useEffect, useRef } from 'react';
import {
    Activity, CheckCircle, AlertCircle, Clock,
    Image, Zap, PlayCircle, PauseCircle
} from 'lucide-react';
import { Badge } from './ui';

interface ActivityEvent {
    id: string;
    type: 'content_created' | 'content_completed' | 'content_failed' | 'image_generated' | 'workflow_started' | 'workflow_step';
    message: string;
    timestamp: Date;
    meta?: {
        contentId?: number;
        step?: string;
        duration?: number;
    };
}

interface ActivityFeedProps {
    tenantId?: number;
    maxItems?: number;
    autoRefresh?: boolean;
}

export default function ActivityFeed({ tenantId, maxItems = 20, autoRefresh = true }: ActivityFeedProps) {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [isLive, setIsLive] = useState(autoRefresh);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        // Mock initial events
        const mockEvents: ActivityEvent[] = [
            {
                id: '1',
                type: 'content_completed',
                message: 'Content "10 SEO Tips for 2024" completed and published',
                timestamp: new Date(Date.now() - 120000),
                meta: { contentId: 123 },
            },
            {
                id: '2',
                type: 'workflow_step',
                message: 'Hemingway agent writing content for "AI Marketing Guide"',
                timestamp: new Date(Date.now() - 180000),
                meta: { step: 'content_writing' },
            },
            {
                id: '3',
                type: 'image_generated',
                message: 'AI generated hero image for blog post',
                timestamp: new Date(Date.now() - 300000),
            },
            {
                id: '4',
                type: 'workflow_started',
                message: 'Started processing "Email Marketing Best Practices"',
                timestamp: new Date(Date.now() - 420000),
                meta: { contentId: 124 },
            },
            {
                id: '5',
                type: 'content_failed',
                message: 'Failed to process "React Tutorial" - API rate limit',
                timestamp: new Date(Date.now() - 600000),
                meta: { contentId: 122 },
            },
        ];

        setEvents(mockEvents);

        // Set up SSE connection for real-time updates
        if (isLive) {
            try {
                const url = tenantId
                    ? `/api/events?tenant_id=${tenantId}`
                    : '/api/events';

                eventSourceRef.current = new EventSource(url);

                eventSourceRef.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    const newEvent: ActivityEvent = {
                        id: Date.now().toString(),
                        type: data.type,
                        message: data.message,
                        timestamp: new Date(),
                        meta: data.meta,
                    };

                    setEvents(prev => [newEvent, ...prev.slice(0, maxItems - 1)]);
                };

                eventSourceRef.current.onerror = () => {
                    eventSourceRef.current?.close();
                };
            } catch (error) {
                console.error('Failed to connect to event stream:', error);
            }
        }

        return () => {
            eventSourceRef.current?.close();
        };
    }, [isLive, tenantId, maxItems]);

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'content_completed':
                return <CheckCircle className="text-green-400" size={16} />;
            case 'content_failed':
                return <AlertCircle className="text-red-400" size={16} />;
            case 'workflow_started':
                return <PlayCircle className="text-indigo-400" size={16} />;
            case 'workflow_step':
                return <Zap className="text-yellow-400" size={16} />;
            case 'image_generated':
                return <Image className="text-purple-400" size={16} />;
            default:
                return <Activity className="text-gray-400" size={16} />;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'content_completed':
                return 'border-l-green-500';
            case 'content_failed':
                return 'border-l-red-500';
            case 'workflow_started':
                return 'border-l-indigo-500';
            case 'workflow_step':
                return 'border-l-yellow-500';
            case 'image_generated':
                return 'border-l-purple-500';
            default:
                return 'border-l-gray-500';
        }
    };

    const formatTime = (date: Date) => {
        const diff = Date.now() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Activity className="text-indigo-400" size={18} />
                    <h3 className="font-medium text-white">Activity Feed</h3>
                </div>
                <button
                    onClick={() => setIsLive(!isLive)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${isLive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                        }`}
                >
                    {isLive ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Live
                        </>
                    ) : (
                        <>
                            <PauseCircle size={12} />
                            Paused
                        </>
                    )}
                </button>
            </div>

            {/* Events */}
            <div className="max-h-[400px] overflow-y-auto">
                {events.length > 0 ? (
                    <div className="divide-y divide-gray-700">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className={`p-3 border-l-2 ${getEventColor(event.type)} hover:bg-gray-700/50 transition-colors`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">{getEventIcon(event.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-200">{event.message}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500">
                                                {formatTime(event.timestamp)}
                                            </span>
                                            {event.meta?.step && (
                                                <Badge variant="gray" className="text-xs">
                                                    {event.meta.step}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <Clock className="mx-auto mb-2" size={32} />
                        <p>No recent activity</p>
                    </div>
                )}
            </div>
        </div>
    );
}
