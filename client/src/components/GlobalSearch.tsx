// Global Search with Cmd+K shortcut
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Image, Users, Calendar, Settings, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface SearchResult {
    id: string;
    type: 'content' | 'tenant' | 'image' | 'user';
    title: string;
    subtitle?: string;
    url: string;
}

export default function GlobalSearch() {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }

            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opening
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Search debounce
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await api.get('/search', { params: { q: query } });
                if (response.data.success) {
                    setResults(response.data.results);
                }
            } catch (error) {
                // Show quick links as fallback
                setResults(([
                    { id: '1', type: 'content' as const, title: 'Content Queue', subtitle: 'View all content', url: '/content' },
                    { id: '2', type: 'tenant' as const, title: 'Tenants', subtitle: 'Manage tenants', url: '/tenants' },
                    { id: '3', type: 'image' as const, title: 'Image Library', subtitle: 'Browse images', url: '/images' },
                    { id: '4', type: 'user' as const, title: 'Users', subtitle: 'Manage users', url: '/users' },
                ]).filter(r => r.title.toLowerCase().includes(query.toLowerCase())));
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            navigate(results[selectedIndex].url);
            setIsOpen(false);
        }
    }, [results, selectedIndex, navigate]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'content': return FileText;
            case 'tenant': return Users;
            case 'image': return Image;
            case 'user': return Users;
            default: return FileText;
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
            >
                <Search size={14} />
                <span>Search...</span>
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">⌘K</kbd>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* Search Panel */}
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl">
                <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-700">
                        {loading ? (
                            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5 text-gray-500" />
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search content, tenants, images..."
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-500 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Results */}
                    {results.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto p-2">
                            {results.map((result, index) => {
                                const Icon = getIcon(result.type);
                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            navigate(result.url);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${index === selectedIndex
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-indigo-500' : 'bg-gray-700'
                                            }`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{result.title}</p>
                                            {result.subtitle && (
                                                <p className={`text-sm truncate ${index === selectedIndex ? 'text-indigo-200' : 'text-gray-500'
                                                    }`}>
                                                    {result.subtitle}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-xs uppercase ${index === selectedIndex ? 'text-indigo-200' : 'text-gray-600'
                                            }`}>
                                            {result.type}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : query && !loading ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No results found for "{query}"</p>
                        </div>
                    ) : !query ? (
                        <div className="p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Quick Links</p>
                            <div className="space-y-1">
                                {[
                                    { icon: FileText, label: 'Content Queue', url: '/content' },
                                    { icon: Calendar, label: 'Calendar', url: '/calendar' },
                                    { icon: Image, label: 'Images', url: '/images' },
                                    { icon: Settings, label: 'Settings', url: '/settings' },
                                ].map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            navigate(item.url);
                                            setIsOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                    >
                                        <item.icon size={16} />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/* Footer */}
                    <div className="p-3 border-t border-gray-700 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">↵</kbd> Select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">↓</kbd> Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Esc</kbd> Close
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
