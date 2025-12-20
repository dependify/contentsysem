// Calendar export and upcoming content sidebar
import { useState } from 'react';
import {
    Download, Calendar, ExternalLink, Clock,
    FileText, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button, Card, Badge, Modal } from './ui';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';

interface ScheduledContent {
    id: number;
    title: string;
    scheduled_for: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    tenant_name?: string;
}

interface CalendarExportProps {
    items: ScheduledContent[];
    tenantName?: string;
}

// iCal format generator
function generateICalEvent(item: ScheduledContent): string {
    const start = new Date(item.scheduled_for);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

    const formatDate = (d: Date) => {
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    return `BEGIN:VEVENT
UID:content-${item.id}@contentsys
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${item.title}
DESCRIPTION:Scheduled content publishing
STATUS:${item.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}
END:VEVENT`;
}

function generateICalFeed(items: ScheduledContent[], name: string): string {
    const events = items.map(generateICalEvent).join('\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ContentSys//Content Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${name} Content Calendar
${events}
END:VCALENDAR`;
}

export function CalendarExport({ items, tenantName = 'ContentSys' }: CalendarExportProps) {
    const [showModal, setShowModal] = useState(false);

    const handleDownloadICal = () => {
        const ical = generateICalFeed(items, tenantName);
        const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tenantName.toLowerCase().replace(/\s+/g, '-')}-content-calendar.ics`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <Button variant="secondary" onClick={() => setShowModal(true)}>
                <Download size={16} /> Export Calendar
            </Button>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Export Calendar"
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                        Export your content calendar to sync with your favorite calendar app.
                    </p>

                    {/* Export Options */}
                    <div className="space-y-3">
                        <button
                            onClick={handleDownloadICal}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-gray-800 transition-colors"
                        >
                            <div className="p-3 bg-indigo-500/20 rounded-lg">
                                <Calendar className="text-indigo-400" size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h4 className="font-medium text-white">Download iCal File</h4>
                                <p className="text-sm text-gray-500">
                                    Works with Apple Calendar, Outlook, and more
                                </p>
                            </div>
                            <Download className="text-gray-500" size={20} />
                        </button>

                        <a
                            href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(window.location.origin + '/api/calendar/ical')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-gray-800 transition-colors"
                        >
                            <div className="p-3 bg-red-500/20 rounded-lg">
                                <Calendar className="text-red-400" size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h4 className="font-medium text-white">Add to Google Calendar</h4>
                                <p className="text-sm text-gray-500">
                                    Subscribe to live calendar updates
                                </p>
                            </div>
                            <ExternalLink className="text-gray-500" size={20} />
                        </a>
                    </div>

                    {/* Upcoming Items Preview */}
                    {items.length > 0 && (
                        <div className="border-t border-gray-700 pt-4">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">
                                {items.length} scheduled items
                            </h4>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {items.slice(0, 5).map(item => (
                                    <div key={item.id} className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-500">
                                            {format(new Date(item.scheduled_for), 'MMM d, h:mm a')}
                                        </span>
                                        <span className="text-gray-300 truncate">{item.title}</span>
                                    </div>
                                ))}
                                {items.length > 5 && (
                                    <p className="text-xs text-gray-500">
                                        and {items.length - 5} more...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}

// Upcoming Content Sidebar
interface UpcomingSidebarProps {
    items: ScheduledContent[];
    onItemClick?: (item: ScheduledContent) => void;
}

export function UpcomingSidebar({ items, onItemClick }: UpcomingSidebarProps) {
    const groupedItems = items.reduce((acc, item) => {
        const date = new Date(item.scheduled_for);
        let group = 'later';

        if (isToday(date)) group = 'today';
        else if (isTomorrow(date)) group = 'tomorrow';
        else if (isThisWeek(date)) group = 'thisWeek';

        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {} as Record<string, ScheduledContent[]>);

    const groups = [
        { key: 'today', label: 'Today' },
        { key: 'tomorrow', label: 'Tomorrow' },
        { key: 'thisWeek', label: 'This Week' },
        { key: 'later', label: 'Later' },
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="success">Done</Badge>;
            case 'processing': return <Badge variant="primary">In Progress</Badge>;
            case 'failed': return <Badge variant="error">Failed</Badge>;
            default: return <Badge variant="gray">Pending</Badge>;
        }
    };

    if (items.length === 0) {
        return (
            <Card>
                <div className="p-6 text-center">
                    <Calendar className="mx-auto mb-3 text-gray-600" size={32} />
                    <h4 className="font-medium text-white mb-1">Nothing Upcoming</h4>
                    <p className="text-sm text-gray-500">
                        Schedule content to see it here
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock size={16} className="text-indigo-400" />
                    Upcoming Content
                </h3>
                <span className="text-xs text-gray-500">{items.length} scheduled</span>
            </div>

            <div className="space-y-4">
                {groups.map(({ key, label }) => {
                    const groupItems = groupedItems[key];
                    if (!groupItems || groupItems.length === 0) return null;

                    return (
                        <div key={key}>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                                {label}
                            </h4>
                            <div className="space-y-2">
                                {groupItems.slice(0, 5).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => onItemClick?.(item)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
                                    >
                                        <div className="flex-shrink-0">
                                            {item.status === 'failed' ? (
                                                <AlertCircle className="text-red-400" size={16} />
                                            ) : (
                                                <FileText className="text-gray-500" size={16} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{item.title}</p>
                                            <p className="text-xs text-gray-500">
                                                {format(new Date(item.scheduled_for), 'h:mm a')}
                                            </p>
                                        </div>
                                        {getStatusBadge(item.status)}
                                        <ChevronRight className="text-gray-600 flex-shrink-0" size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
