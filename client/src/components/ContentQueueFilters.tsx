// Content Queue Filter & Sort Component
import { useState } from 'react';
import { Filter, SortAsc, SortDesc, X, Calendar, Search } from 'lucide-react';
import { Button, Badge } from './ui';

interface ContentQueueFiltersProps {
    onFilterChange: (filters: FilterState) => void;
    onSortChange: (sort: SortState) => void;
    filters: FilterState;
    sort: SortState;
}

export interface FilterState {
    status: string[];
    keyword: string;
    dateFrom: string;
    dateTo: string;
}

export interface SortState {
    field: 'created_at' | 'scheduled_for' | 'title' | 'status';
    order: 'asc' | 'desc';
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', color: 'gray' },
    { value: 'processing', label: 'Processing', color: 'primary' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'failed', label: 'Failed', color: 'error' },
    { value: 'paused', label: 'Paused', color: 'warning' },
];

const SORT_OPTIONS = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'scheduled_for', label: 'Scheduled Date' },
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
];

export default function ContentQueueFilters({
    onFilterChange,
    onSortChange,
    filters,
    sort,
}: ContentQueueFiltersProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const toggleStatus = (status: string) => {
        const newStatus = filters.status.includes(status)
            ? filters.status.filter(s => s !== status)
            : [...filters.status, status];
        onFilterChange({ ...filters, status: newStatus });
    };

    const clearFilters = () => {
        onFilterChange({
            status: [],
            keyword: '',
            dateFrom: '',
            dateTo: '',
        });
    };

    const hasActiveFilters = filters.status.length > 0 || filters.keyword || filters.dateFrom || filters.dateTo;

    return (
        <div className="space-y-4">
            {/* Main Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by title or keyword..."
                        value={filters.keyword}
                        onChange={(e) => onFilterChange({ ...filters, keyword: e.target.value })}
                        className="input pl-10"
                    />
                </div>

                {/* Status Quick Filters */}
                <div className="flex items-center gap-2">
                    {STATUS_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => toggleStatus(option.value)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filters.status.includes(option.value)
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Advanced Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={showAdvanced ? 'bg-gray-800' : ''}
                >
                    <Filter size={14} />
                    Advanced
                </Button>

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <select
                        value={sort.field}
                        onChange={(e) => onSortChange({ ...sort, field: e.target.value as any })}
                        className="select text-sm"
                    >
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSortChange({ ...sort, order: sort.order === 'asc' ? 'desc' : 'asc' })}
                    >
                        {sort.order === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                    </Button>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X size={14} /> Clear
                    </Button>
                )}
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="p-4 bg-gray-800/50 rounded-lg flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs text-gray-500 mb-1">From Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                                className="input pl-10"
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs text-gray-500 mb-1">To Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                                className="input pl-10"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Active Filter Tags */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Active filters:</span>
                    {filters.status.map((status) => (
                        <button key={status} onClick={() => toggleStatus(status)} className="cursor-pointer">
                            <Badge variant="primary" className="flex items-center gap-1">
                                {status} <X size={12} />
                            </Badge>
                        </button>
                    ))}
                    {filters.keyword && (
                        <button onClick={() => onFilterChange({ ...filters, keyword: '' })} className="cursor-pointer">
                            <Badge variant="primary" className="flex items-center gap-1">
                                "{filters.keyword}" <X size={12} />
                            </Badge>
                        </button>
                    )}
                    {filters.dateFrom && (
                        <button onClick={() => onFilterChange({ ...filters, dateFrom: '' })} className="cursor-pointer">
                            <Badge variant="primary" className="flex items-center gap-1">
                                From: {filters.dateFrom} <X size={12} />
                            </Badge>
                        </button>
                    )}
                    {filters.dateTo && (
                        <button onClick={() => onFilterChange({ ...filters, dateTo: '' })} className="cursor-pointer">
                            <Badge variant="primary" className="flex items-center gap-1">
                                To: {filters.dateTo} <X size={12} />
                            </Badge>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
