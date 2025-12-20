// Image selection modal for content
import { useState, useEffect } from 'react';
import {
    Image, Check, Search, Upload, Wand2,
    Grid, List
} from 'lucide-react';
import { Button, Modal, Badge, Spinner } from './ui';
import api from '../lib/api';

interface ImageAsset {
    id: number;
    url: string;
    filename: string;
    alt_text?: string;
    tags?: string[];
    width?: number;
    height?: number;
}

interface ImageSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (image: ImageAsset) => void;
    tenantId: number;
    multiple?: boolean;
    selectedIds?: number[];
}

export default function ImageSelector({
    isOpen,
    onClose,
    onSelect,
    tenantId,
    multiple = false,
    selectedIds = [],
}: ImageSelectorProps) {
    const [images, setImages] = useState<ImageAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selected, setSelected] = useState<number[]>(selectedIds);
    const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'generate'>('library');

    useEffect(() => {
        if (isOpen) {
            fetchImages();
            setSelected(selectedIds);
        }
    }, [isOpen, tenantId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else if (isOpen) {
                fetchImages();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const response = await api.get('/images/search', {
                params: {
                    tenant_id: tenantId,
                    query: searchQuery
                }
            });
            if (response.data.success) {
                setImages(response.data.images);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchImages = async () => {
        setLoading(true);
        try {
            const response = await api.get('/images', { params: { tenant_id: tenantId } });
            if (response.data.success) {
                setImages(response.data.images);
            }
        } catch (error) {
            console.error('Failed to fetch images:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredImages = images;

    const toggleSelect = (image: ImageAsset) => {
        if (multiple) {
            setSelected(prev =>
                prev.includes(image.id)
                    ? prev.filter(id => id !== image.id)
                    : [...prev, image.id]
            );
        } else {
            onSelect(image);
        }
    };

    const handleConfirm = () => {
        const selectedImages = images.filter(img => selected.includes(img.id));
        selectedImages.forEach(img => onSelect(img));
        onClose();
    };

    const isSelected = (id: number) => selected.includes(id);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Image"
            size="xl"
        >
            <div className="flex flex-col h-[600px]">
                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-gray-700 pb-3 mb-4">
                    {[
                        { id: 'library', label: 'Library', icon: Image },
                        { id: 'upload', label: 'Upload', icon: Upload },
                        { id: 'generate', label: 'AI Generate', icon: Wand2 },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === id
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === 'library' && (
                    <>
                        {/* Search & View Toggle */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search images..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input pl-10 w-full"
                                />
                            </div>
                            <div className="flex border border-gray-700 rounded-lg">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Image Grid/List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Spinner size="lg" />
                                </div>
                            ) : filteredImages.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-4 gap-3">
                                        {filteredImages.map(image => (
                                            <button
                                                key={image.id}
                                                onClick={() => toggleSelect(image)}
                                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected(image.id)
                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                                                    : 'border-transparent hover:border-gray-600'
                                                    }`}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={image.alt_text || image.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                                {isSelected(image.id) && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                                        <Check size={14} className="text-white" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                    <p className="text-xs text-white truncate">{image.filename}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredImages.map(image => (
                                            <button
                                                key={image.id}
                                                onClick={() => toggleSelect(image)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected(image.id)
                                                    ? 'border-indigo-500 bg-indigo-500/10'
                                                    : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                                    }`}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={image.alt_text || image.filename}
                                                    className="w-16 h-12 object-cover rounded"
                                                />
                                                <div className="flex-1 text-left">
                                                    <p className="text-sm text-white">{image.filename}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {image.width}x{image.height}
                                                    </p>
                                                </div>
                                                {image.tags && image.tags.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {image.tags.slice(0, 2).map(tag => (
                                                            <Badge key={tag} variant="gray" className="text-xs">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                                {isSelected(image.id) && (
                                                    <Check className="text-indigo-400" size={20} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <Image size={48} className="mb-4" />
                                    <p>No images found</p>
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="text-indigo-400 text-sm mt-2 hover:underline"
                                        >
                                            Clear search
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {multiple && (
                            <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-4">
                                <span className="text-sm text-gray-400">
                                    {selected.length} image{selected.length !== 1 ? 's' : ''} selected
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                                    <Button onClick={handleConfirm} disabled={selected.length === 0}>
                                        <Check size={16} /> Confirm Selection
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'upload' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="border-2 border-dashed border-gray-700 rounded-lg p-12">
                                <Upload className="mx-auto mb-4 text-gray-500" size={48} />
                                <p className="text-gray-400 mb-2">Drag and drop images here</p>
                                <p className="text-gray-500 text-sm mb-4">or</p>
                                <Button variant="secondary">Browse Files</Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'generate' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md">
                            <Wand2 className="mx-auto mb-4 text-indigo-400" size={48} />
                            <h3 className="text-lg font-medium text-white mb-2">AI Image Generation</h3>
                            <p className="text-gray-400 mb-4">
                                Generate custom images using AI. Describe what you want and we'll create it.
                            </p>
                            <Button>
                                <Wand2 size={16} /> Open Generator
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
