// Image search and filter by tags
import { useState, useMemo, useEffect } from 'react';
import { Search, X, Tag, Filter, Grid, List, SortAsc } from 'lucide-react';
import { Button, Badge, Input } from './ui';

interface ImageAsset {
    id: number;
    url: string;
    filename: string;
    alt_text?: string;
    tags: string[];
    created_at: string;
    size?: number;
    width?: number;
    height?: number;
}

interface ImageSearchFilterProps {
    images: ImageAsset[];
    onFilteredChange: (filtered: ImageAsset[]) => void;
    allTags?: string[];
}

export default function ImageSearchFilter({
    images,
    onFilteredChange,
    allTags = []
}: ImageSearchFilterProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showFilters, setShowFilters] = useState(false);

    // Extract all unique tags from images if not provided
    const availableTags = useMemo(() => {
        if (allTags.length > 0) return allTags;
        const tagSet = new Set<string>();
        images.forEach(img => img.tags?.forEach(tag => tagSet.add(tag)));
        return Array.from(tagSet).sort();
    }, [images, allTags]);

    const filteredImages = useMemo(() => {
        let result = [...images];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(img =>
                img.filename.toLowerCase().includes(query) ||
                img.alt_text?.toLowerCase().includes(query) ||
                img.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // Apply tag filter
        if (selectedTags.length > 0) {
            result = result.filter(img =>
                selectedTags.every(tag => img.tags?.includes(tag))
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'name':
                    comparison = a.filename.localeCompare(b.filename);
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [images, searchQuery, selectedTags, sortBy, sortOrder]);

    useEffect(() => {
        onFilteredChange(filteredImages);
    }, [filteredImages, onFilteredChange]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedTags([]);
    };

    const hasActiveFilters = searchQuery || selectedTags.length > 0;

    return (
        <div className="space-y-3">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search images by name, alt text, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10 w-full"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <Button
                    variant={showFilters ? 'primary' : 'secondary'}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={16} />
                    {selectedTags.length > 0 && (
                        <span className="ml-1 bg-white/20 rounded-full px-1.5 text-xs">
                            {selectedTags.length}
                        </span>
                    )}
                </Button>

                <div className="flex items-center border border-gray-700 rounded-lg">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent text-sm text-gray-300 px-2 py-1.5 border-r border-gray-700"
                    >
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-1.5 text-gray-400 hover:text-white"
                    >
                        <SortAsc size={16} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
                    </button>
                </div>
            </div>

            {/* Tag Filters */}
            {showFilters && availableTags.length > 0 && (
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Tag size={14} className="text-gray-500" />
                        <span className="text-xs text-gray-500 uppercase">Filter by tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-2 py-1 rounded-full text-xs transition-colors ${selectedTags.includes(tag)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Filters */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Showing {filteredImages.length} of {images.length}:</span>
                    {searchQuery && (
                        <Badge variant="primary" className="flex items-center gap-1">
                            "{searchQuery}"
                            <button onClick={() => setSearchQuery('')}><X size={12} /></button>
                        </Badge>
                    )}
                    {selectedTags.map(tag => (
                        <Badge key={tag} variant="primary" className="flex items-center gap-1">
                            {tag}
                            <button onClick={() => toggleTag(tag)}><X size={12} /></button>
                        </Badge>
                    ))}
                    <button
                        onClick={clearFilters}
                        className="text-xs text-indigo-400 hover:underline"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
