// Calendar drag-and-drop rescheduling
import { useState } from 'react';
import {
    ChevronLeft, ChevronRight,
    CheckCircle, AlertCircle, Loader2, GripVertical
} from 'lucide-react';
import {
    startOfWeek, endOfWeek, addWeeks, subWeeks, format,
    eachDayOfInterval, isSameDay, isToday, addHours, startOfDay,
    setHours, setMinutes
} from 'date-fns';
import { Button, Badge } from './ui';

interface ScheduledItem {
    id: number;
    title: string;
    scheduled_for: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface DraggableCalendarProps {
    items: ScheduledItem[];
    onReschedule: (itemId: number, newDate: Date) => Promise<void>;
    onClickItem?: (item: ScheduledItem) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORKING_HOURS = HOURS.filter(h => h >= 6 && h <= 22);

export default function DraggableCalendar({ items, onReschedule, onClickItem }: DraggableCalendarProps) {
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [draggedItem, setDraggedItem] = useState<ScheduledItem | null>(null);
    const [dropTarget, setDropTarget] = useState<{ day: Date; hour: number } | null>(null);
    const [rescheduling, setRescheduling] = useState<number | null>(null);

    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

    const days = useMemo(() =>
        eachDayOfInterval({ start: weekStart, end: weekEnd }),
        [weekStart, weekEnd]
    );

    const getItemsForSlot = (day: Date, hour: number): ScheduledItem[] => {
        return items.filter(item => {
            const itemDate = new Date(item.scheduled_for);
            return isSameDay(itemDate, day) && itemDate.getHours() === hour;
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500/30 border-green-500 text-green-300';
            case 'processing': return 'bg-indigo-500/30 border-indigo-500 text-indigo-300';
            case 'failed': return 'bg-red-500/30 border-red-500 text-red-300';
            default: return 'bg-gray-700 border-gray-600 text-gray-300';
        }
    };

    const handleDragStart = (e: React.DragEvent, item: ScheduledItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id.toString());
    };

    const handleDragOver = (e: React.DragEvent, day: Date, hour: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ day, hour });
    };

    const handleDragLeave = () => {
        setDropTarget(null);
    };

    const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
        e.preventDefault();
        setDropTarget(null);

        if (!draggedItem) return;

        const newDate = setMinutes(setHours(day, hour), 0);

        // Check if actually moved
        const oldDate = new Date(draggedItem.scheduled_for);
        if (isSameDay(oldDate, newDate) && oldDate.getHours() === hour) {
            setDraggedItem(null);
            return;
        }

        setRescheduling(draggedItem.id);
        try {
            await onReschedule(draggedItem.id, newDate);
        } finally {
            setRescheduling(null);
            setDraggedItem(null);
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDropTarget(null);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                        <ChevronLeft size={20} />
                    </Button>
                    <h2 className="text-lg font-semibold text-white">
                        {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                        <ChevronRight size={20} />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="gray">
                        <GripVertical size={12} className="mr-1" />
                        Drag to reschedule
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(new Date())}>
                        Today
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-8 bg-gray-800">
                    <div className="p-2 text-center text-xs text-gray-500 border-r border-gray-700">
                        Time
                    </div>
                    {days.map((day) => (
                        <div
                            key={day.toISOString()}
                            className={`p-2 text-center border-r border-gray-700 last:border-r-0 ${isToday(day) ? 'bg-indigo-900/30' : ''
                                }`}
                        >
                            <div className={`text-xs ${isToday(day) ? 'text-indigo-400' : 'text-gray-500'}`}>
                                {format(day, 'EEE')}
                            </div>
                            <div className={`text-lg font-semibold ${isToday(day) ? 'text-indigo-400' : 'text-white'}`}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Time Slots */}
                <div className="max-h-[500px] overflow-y-auto">
                    {WORKING_HOURS.map((hour) => (
                        <div key={hour} className="grid grid-cols-8 border-t border-gray-700">
                            {/* Time Label */}
                            <div className="p-2 text-xs text-gray-500 text-right pr-4 border-r border-gray-700 bg-gray-800/50">
                                {format(addHours(startOfDay(new Date()), hour), 'h a')}
                            </div>

                            {/* Day Columns */}
                            {days.map((day) => {
                                const slotItems = getItemsForSlot(day, hour);
                                const isDropTarget = dropTarget &&
                                    isSameDay(dropTarget.day, day) &&
                                    dropTarget.hour === hour;

                                return (
                                    <div
                                        key={`${day.toISOString()}-${hour}`}
                                        className={`min-h-[60px] p-1 border-r border-gray-700 last:border-r-0 transition-colors ${isToday(day) ? 'bg-indigo-900/10' : ''
                                            } ${isDropTarget ? 'bg-indigo-500/20 ring-2 ring-indigo-500 ring-inset' : ''}`}
                                        onDragOver={(e) => handleDragOver(e, day, hour)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, day, hour)}
                                    >
                                        {slotItems.map((item) => (
                                            <div
                                                key={item.id}
                                                draggable={item.status === 'pending'}
                                                onDragStart={(e) => handleDragStart(e, item)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => onClickItem?.(item)}
                                                className={`p-1.5 mb-1 rounded text-xs border cursor-pointer ${getStatusColor(item.status)} ${item.status === 'pending' ? 'cursor-grab active:cursor-grabbing' : ''
                                                    } ${draggedItem?.id === item.id ? 'opacity-50' : ''} ${rescheduling === item.id ? 'animate-pulse' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {item.status === 'pending' && (
                                                        <GripVertical size={10} className="opacity-50" />
                                                    )}
                                                    {rescheduling === item.id ? (
                                                        <Loader2 size={10} className="animate-spin" />
                                                    ) : item.status === 'completed' ? (
                                                        <CheckCircle size={10} />
                                                    ) : item.status === 'failed' ? (
                                                        <AlertCircle size={10} />
                                                    ) : null}
                                                    <span className="truncate font-medium">{item.title}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
