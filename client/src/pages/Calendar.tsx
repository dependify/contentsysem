// Content Calendar with monthly/weekly views
import { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
    List, Grid, Clock, MoreHorizontal, Edit, Trash, RefreshCw
} from 'lucide-react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO
} from 'date-fns';
import { Button, Card, Badge, Modal, Input, Dropdown, Spinner, EmptyState } from '../components/ui';
import { useTenant } from '../context/TenantContext';
import api from '../lib/api';

interface ContentItem {
    id: number;
    title: string;
    status: string;
    scheduled_for: string;
    type: 'content' | 'schedule';
}

interface CalendarData {
    [date: string]: ContentItem[];
}

export default function ContentCalendar() {
    const { currentTenant } = useTenant();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week' | 'list'>('month');
    const [calendarData, setCalendarData] = useState<CalendarData>({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSchedule, setNewSchedule] = useState({
        title: '',
        date: '',
        time: '09:00',
    });

    const fetchCalendarData = async () => {
        if (!currentTenant) return;

        try {
            setLoading(true);
            const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

            const response = await api.get('/calendar', {
                params: {
                    tenant_id: currentTenant.id,
                    start_date: start,
                    end_date: end,
                }
            });

            if (response.data.success) {
                setCalendarData(response.data.calendar);
            }
        } catch (error) {
            console.error('Failed to fetch calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendarData();
    }, [currentTenant, currentDate]);

    const handleScheduleContent = async () => {
        if (!currentTenant || !newSchedule.title || !newSchedule.date) return;

        try {
            await api.put('/calendar/new', {
                tenant_id: currentTenant.id,
                title: newSchedule.title,
                scheduled_date: newSchedule.date,
                scheduled_time: newSchedule.time,
            });

            setShowAddModal(false);
            setNewSchedule({ title: '', date: '', time: '09:00' });
            fetchCalendarData();
        } catch (error) {
            console.error('Failed to schedule content:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complete': return 'bg-green-500/20 text-green-300';
            case 'processing': return 'bg-blue-500/20 text-blue-300';
            case 'failed': return 'bg-red-500/20 text-red-300';
            default: return 'bg-gray-600/50 text-gray-300';
        }
    };

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const days: Date[] = [];
        let day = startDate;

        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }

        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-700">
                    {weekDays.map(d => (
                        <div key={d} className="p-3 text-center text-xs font-semibold text-gray-400 uppercase">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7">
                    {days.map((dayItem, i) => {
                        const dateKey = format(dayItem, 'yyyy-MM-dd');
                        const items = calendarData[dateKey] || [];
                        const isCurrentMonth = isSameMonth(dayItem, currentDate);
                        const isToday = isSameDay(dayItem, new Date());

                        return (
                            <div
                                key={i}
                                className={`min-h-[120px] border-b border-r border-gray-700 p-2 cursor-pointer
                  ${isCurrentMonth ? 'bg-gray-800' : 'bg-gray-800/50'}
                  ${isToday ? 'bg-indigo-900/30' : ''}
                  hover:bg-gray-700/50 transition-colors`}
                                onClick={() => {
                                    setNewSchedule({ ...newSchedule, date: dateKey });
                                    setShowAddModal(true);
                                }}
                            >
                                <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-300' : 'text-gray-600'} ${isToday ? 'text-indigo-400' : ''}`}>
                                    {format(dayItem, 'd')}
                                </div>
                                <div className="space-y-1">
                                    {items.slice(0, 3).map((item, j) => (
                                        <div
                                            key={j}
                                            className={`text-xs px-1.5 py-0.5 rounded truncate ${getStatusColor(item.status)}`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {item.title}
                                        </div>
                                    ))}
                                    {items.length > 3 && (
                                        <div className="text-xs text-gray-500">+{items.length - 3} more</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderListView = () => {
        const allItems = Object.entries(calendarData)
            .flatMap(([date, items]) => items.map(item => ({ ...item, date })))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (allItems.length === 0) {
            return (
                <EmptyState
                    icon={<CalendarIcon className="w-16 h-16" />}
                    title="No scheduled content"
                    description="Start by adding some content to your calendar"
                    action={
                        <Button onClick={() => setShowAddModal(true)}>
                            <Plus size={16} /> Schedule Content
                        </Button>
                    }
                />
            );
        }

        return (
            <div className="space-y-2">
                {allItems.map((item, i) => (
                    <Card key={i} hover className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">
                                        {format(parseISO(item.date), 'd')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {format(parseISO(item.date), 'MMM')}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">{item.title}</h3>
                                    <p className="text-sm text-gray-400">
                                        {format(parseISO(item.date), 'EEEE, MMMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge
                                    variant={
                                        item.status === 'complete' ? 'success' :
                                            item.status === 'failed' ? 'error' :
                                                item.status === 'processing' ? 'primary' : 'gray'
                                    }
                                >
                                    {item.status}
                                </Badge>
                                <Dropdown
                                    trigger={<Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>}
                                    items={[
                                        { label: 'Edit', icon: <Edit size={14} />, onClick: () => { } },
                                        { label: 'Reschedule', icon: <Clock size={14} />, onClick: () => { } },
                                        { label: 'Delete', icon: <Trash size={14} />, onClick: () => { }, danger: true },
                                    ]}
                                />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    if (!currentTenant) {
        return (
            <EmptyState
                icon={<CalendarIcon className="w-16 h-16" />}
                title="No tenant selected"
                description="Please select a tenant to view the content calendar"
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Content Calendar</h1>
                    <p className="text-gray-400">Schedule and manage your content publishing</p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus size={16} /> Schedule Content
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft size={20} />
                    </Button>
                    <h2 className="text-lg font-semibold text-white min-w-[200px] text-center">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight size={20} />
                    </Button>
                    <Button variant="ghost" onClick={() => setCurrentDate(new Date())}>
                        Today
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={fetchCalendarData}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <div className="flex bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setView('month')}
                            className={`px-3 py-1 text-sm rounded ${view === 'month' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                        >
                            <Grid size={16} />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1 text-sm rounded ${view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <Spinner size="lg" />
                </div>
            ) : (
                <>
                    {view === 'month' && renderMonthView()}
                    {view === 'list' && renderListView()}
                </>
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Schedule Content"
            >
                <div className="space-y-4">
                    <Input
                        label="Content Title"
                        placeholder="Enter the blog post title"
                        value={newSchedule.title}
                        onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                        required
                    />
                    <Input
                        label="Date"
                        type="date"
                        value={newSchedule.date}
                        onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                        required
                    />
                    <Input
                        label="Time"
                        type="time"
                        value={newSchedule.time}
                        onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                    <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button onClick={handleScheduleContent}>
                        <Plus size={16} /> Add to Calendar
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
