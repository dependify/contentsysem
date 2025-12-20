// Image Tagging System Component
import { useState, useEffect } from 'react';
import { Tag, Plus, X, Search } from 'lucide-react';
import { Button, Badge } from './ui';
import api from '../lib/api';

interface ImageTag {
    id: number;
    name: string;
    color?: string;
}

interface ImageTaggingProps {
    imageId: number;
    existingTags?: ImageTag[];
    onTagsChange?: (tags: ImageTag[]) => void;
}

// Predefined tag colors
const TAG_COLORS = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-teal-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
];

export default function ImageTagging({ imageId, existingTags = [], onTagsChange }: ImageTaggingProps) {
    const [tags, setTags] = useState<ImageTag[]>(existingTags);
    const [allTags, setAllTags] = useState<ImageTag[]>([]);
    const [newTagName, setNewTagName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAllTags();
    }, []);

    useEffect(() => {
        setTags(existingTags);
    }, [existingTags]);

    const fetchAllTags = async () => {
        try {
            const res = await api.get('/images/tags');
            if (res.data.success) {
                setAllTags(res.data.tags);
            }
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }
    };

    const addTag = async (tag: ImageTag) => {
        if (tags.find(t => t.id === tag.id)) return;

        setLoading(true);
        try {
            await api.post(`/images/${imageId}/tags`, { tag_id: tag.id });
            const updatedTags = [...tags, tag];
            setTags(updatedTags);
            onTagsChange?.(updatedTags);
            setIsDropdownOpen(false);
            setSearchQuery('');
        } catch (error) {
            console.error('Failed to add tag:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeTag = async (tagId: number) => {
        setLoading(true);
        try {
            await api.delete(`/images/${imageId}/tags/${tagId}`);
            const updatedTags = tags.filter(t => t.id !== tagId);
            setTags(updatedTags);
            onTagsChange?.(updatedTags);
        } catch (error) {
            console.error('Failed to remove tag:', error);
        } finally {
            setLoading(false);
        }
    };

    const createAndAddTag = async () => {
        if (!newTagName.trim()) return;

        setLoading(true);
        try {
            const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
            const res = await api.post('/images/tags', { name: newTagName.trim(), color });

            if (res.data.success) {
                const newTag = res.data.tag;
                setAllTags([...allTags, newTag]);
                await addTag(newTag);
                setNewTagName('');
            }
        } catch (error) {
            console.error('Failed to create tag:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTags = allTags.filter(tag =>
        !tags.find(t => t.id === tag.id) &&
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-3">
            {/* Current Tags */}
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <Badge
                        key={tag.id}
                        variant="primary"
                        className={`flex items-center gap-1 ${tag.color || 'bg-indigo-600'}`}
                    >
                        <span>{tag.name}</span>
                        <button
                            onClick={() => removeTag(tag.id)}
                            className="ml-1 hover:text-red-300 transition-colors"
                            disabled={loading}
                        >
                            <X size={12} />
                        </button>
                    </Badge>
                ))}
                {tags.length === 0 && (
                    <span className="text-sm text-gray-500">No tags</span>
                )}
            </div>

            {/* Add Tag Dropdown */}
            <div className="relative">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={loading}
                >
                    <Tag size={14} />
                    Add Tag
                </Button>

                {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                        {/* Search */}
                        <div className="p-2 border-b border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search or create tag..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded pl-8 pr-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Existing Tags */}
                        <div className="max-h-40 overflow-y-auto py-1">
                            {filteredTags.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                    {searchQuery ? 'No matching tags' : 'No tags available'}
                                </div>
                            ) : (
                                filteredTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => addTag(tag)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                                    >
                                        <div className={`w-3 h-3 rounded-full ${tag.color || 'bg-gray-500'}`} />
                                        <span>{tag.name}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Create New Tag */}
                        {searchQuery && !allTags.find(t => t.name.toLowerCase() === searchQuery.toLowerCase()) && (
                            <div className="border-t border-gray-700 p-2">
                                <button
                                    onClick={() => {
                                        setNewTagName(searchQuery);
                                        createAndAddTag();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:bg-gray-700 rounded transition-colors"
                                >
                                    <Plus size={14} />
                                    Create "{searchQuery}"
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
