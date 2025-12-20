// Custom Date Range Selector Component
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { Button } from './ui';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

interface DateRange {
    from: Date;
    to: Date;
    label?: string;
}

interface DateRangeSelectorProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    className?: string;
}

const PRESETS: { label: string; getValue: () => DateRange }[] = [
    {
        label: 'Today',
        getValue: () => ({ from: new Date(), to: new Date(), label: 'Today' })
    },
    {
        label: 'Last 7 days',
        getValue: () => ({ from: subDays(new Date(), 7), to: new Date(), label: 'Last 7 days' })
    },
    {
        label: 'Last 30 days',
        getValue: () => ({ from: subDays(new Date(), 30), to: new Date(), label: 'Last 30 days' })
    },
    {
        label: 'Last 90 days',
        getValue: () => ({ from: subDays(new Date(), 90), to: new Date(), label: 'Last 90 days' })
    },
    {
        label: 'This month',
        getValue: () => ({ from: startOfMonth(new Date()), to: new Date(), label: 'This month' })
    },
    {
        label: 'Last month',
        getValue: () => {
            const lastMonth = subMonths(new Date(), 1);
            return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth), label: 'Last month' };
        }
    },
    {
        label: 'This year',
        getValue: () => ({ from: startOfYear(new Date()), to: new Date(), label: 'This year' })
    },
];

export default function DateRangeSelector({ value, onChange, className = '' }: DateRangeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState(format(value.from, 'yyyy-MM-dd'));
    const [customTo, setCustomTo] = useState(format(value.to, 'yyyy-MM-dd'));
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetSelect = (preset: typeof PRESETS[0]) => {
        const range = preset.getValue();
        onChange(range);
        setIsOpen(false);
    };

    const handleCustomApply = () => {
        const from = new Date(customFrom);
        const to = new Date(customTo);

        if (from > to) {
            alert('Start date must be before end date');
            return;
        }

        onChange({
            from,
            to,
            label: `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`
        });
        setIsOpen(false);
    };

    const displayLabel = value.label || `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d, yyyy')}`;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors text-sm"
            >
                <Calendar size={16} className="text-gray-400" />
                <span>{displayLabel}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="flex">
                        {/* Presets */}
                        <div className="w-1/2 border-r border-gray-700 py-2">
                            <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wide">Presets</div>
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetSelect(preset)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${value.label === preset.label ? 'bg-indigo-600/30 text-indigo-300' : 'text-gray-300'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom Range */}
                        <div className="w-1/2 p-3 space-y-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Custom Range</div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">From</label>
                                <input
                                    type="date"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">To</label>
                                <input
                                    type="date"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <Button size="sm" onClick={handleCustomApply} className="w-full">
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
