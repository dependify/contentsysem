
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

export default function Schedule({ tenantId }: { tenantId: number }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledItems, setScheduledItems] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, fetch scheduled items for the month
    api.get(`/queue/status/${tenantId}`)
      .then(res => setScheduledItems(res.data.queue_status))
      .catch(console.error);
  }, [tenantId, currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon size={20} className="text-indigo-400" />
          Content Calendar
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-700 rounded">&lt;</button>
          <span className="font-medium w-32 text-center">{format(currentDate, 'MMMM yyyy')}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-700 rounded">&gt;</button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-900">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="p-2 text-center text-xs text-gray-500 font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-gray-800">
        {days.map(day => {
          const items = scheduledItems.filter(i => isSameDay(new Date(i.scheduled_for), day));
          return (
            <div key={day.toISOString()} className="min-h-[100px] border-r border-b border-gray-700 p-2 relative">
              <span className={`text-sm ${!isSameMonth(day, currentDate) ? 'text-gray-600' : 'text-gray-300'}`}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {items.map(item => (
                  <div key={item.id} className="text-xs bg-indigo-900/50 text-indigo-200 p-1 rounded truncate border border-indigo-900">
                    <Clock size={10} className="inline mr-1" />
                    {format(new Date(item.scheduled_for), 'HH:mm')} {item.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
