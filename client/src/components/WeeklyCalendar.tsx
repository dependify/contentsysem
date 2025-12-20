// Weekly Calendar View
import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Clock, CheckCircle,
  AlertCircle, Loader2
} from 'lucide-react';
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks, format,
  eachDayOfInterval, isSameDay, isToday, addHours, startOfDay
} from 'date-fns';
import { Button, Modal } from './ui';

interface ScheduledItem {
  id: number;
  title: string;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface WeeklyCalendarProps {
  items: ScheduledItem[];
  onAddItem?: (date: Date, time: string) => void;
  onClickItem?: (item: ScheduledItem) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORKING_HOURS = HOURS.filter(h => h >= 6 && h <= 22);

export default function WeeklyCalendar({ items, onAddItem, onClickItem }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={12} />;
      case 'processing': return <Loader2 size={12} className="animate-spin" />;
      case 'failed': return <AlertCircle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const handleSlotClick = (day: Date, hour: number) => {
    setSelectedSlot({ date: day, hour });
    setShowAddModal(true);
  };

  const handleAddContent = () => {
    if (selectedSlot && onAddItem) {
      const time = `${selectedSlot.hour.toString().padStart(2, '0')}:00`;
      onAddItem(selectedSlot.date, time);
      setShowAddModal(false);
    }
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
        <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(new Date())}>
          Today
        </Button>
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

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`min-h-[60px] p-1 border-r border-gray-700 last:border-r-0 hover:bg-gray-800/50 cursor-pointer transition-colors ${isToday(day) ? 'bg-indigo-900/10' : ''
                      }`}
                    onClick={() => handleSlotClick(day, hour)}
                  >
                    {slotItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={(e) => { e.stopPropagation(); onClickItem?.(item); }}
                        className={`p-1.5 mb-1 rounded text-xs border cursor-pointer ${getStatusColor(item.status)}`}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
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

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Schedule Content"
        size="sm"
      >
        {selectedSlot && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-white font-medium">
                {format(selectedSlot.date, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-gray-400 text-sm">
                at {format(addHours(startOfDay(new Date()), selectedSlot.hour), 'h:mm a')}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddContent}>
                <Plus size={16} /> Add Content
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
