// Embedded image management for content editor
import { useState, useEffect } from 'react';
import {
    Image, Plus, Trash, MoveUp, MoveDown, Edit,
    Link, Check, Upload
} from 'lucide-react';
import { Button, Modal, Input, Card, Spinner } from './ui';
import ImageSelector from './ImageSelector';
import api from '../lib/api';

interface EmbeddedImage {
    id: string;
    url: string;
    alt: string;
    caption?: string;
    position: number;
}

interface EmbeddedImageManagerProps {
    contentId: number;
    tenantId: number;
    images: EmbeddedImage[];
    onChange: (images: EmbeddedImage[]) => void;
    onInsertImage?: (imageUrl: string, alt: string) => void;
}

export default function EmbeddedImageManager({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contentId,
    tenantId,
    images,
    onChange,
    onInsertImage,
}: EmbeddedImageManagerProps) {
    const [showModal, setShowModal] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [editingImage, setEditingImage] = useState<EmbeddedImage | null>(null);
    const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
    const [urlInput, setUrlInput] = useState('');
    const [altInput, setAltInput] = useState('');
    const [captionInput, setCaptionInput] = useState('');

    // Simplified: we'll use ImageSelector for library

    const addImage = (url: string, alt: string, caption?: string) => {
        const newImage: EmbeddedImage = {
            id: Math.random().toString(36).substr(2, 9),
            url,
            alt,
            caption,
            position: images.length,
        };
        onChange([...images, newImage]);
        onInsertImage?.(url, alt);
        closeModal();
    };

    const updateImage = (id: string, updates: Partial<EmbeddedImage>) => {
        onChange(images.map(img => img.id === id ? { ...img, ...updates } : img));
    };

    const deleteImage = (id: string) => {
        onChange(images.filter(img => img.id !== id));
    };

    const moveImage = (id: string, direction: 'up' | 'down') => {
        const index = images.findIndex(img => img.id === id);
        if (direction === 'up' && index > 0) {
            const newImages = [...images];
            [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
            onChange(newImages.map((img, i) => ({ ...img, position: i })));
        } else if (direction === 'down' && index < images.length - 1) {
            const newImages = [...images];
            [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
            onChange(newImages.map((img, i) => ({ ...img, position: i })));
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingImage(null);
        setUrlInput('');
        setAltInput('');
        setCaptionInput('');
    };

    const handleLibrarySelect = (img: any) => {
        addImage(img.url, img.alt_text || img.filename, '');
        setShowLibrary(false);
    };

    const handleUrlSubmit = () => {
        if (urlInput.trim()) {
            addImage(urlInput, altInput || 'Image', captionInput);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Image size={16} className="text-indigo-400" />
                    Embedded Images ({images.length})
                </h3>
                <Button size="sm" onClick={() => setShowModal(true)}>
                    <Plus size={14} /> Add Image
                </Button>
            </div>

            {/* Image List */}
            {images.length > 0 ? (
                <div className="space-y-2">
                    {images.map((img, index) => (
                        <div
                            key={img.id}
                            className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg group"
                        >
                            <img
                                src={img.url}
                                alt={img.alt}
                                className="w-16 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{img.alt}</p>
                                {img.caption && (
                                    <p className="text-xs text-gray-500 truncate">{img.caption}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveImage(img.id, 'up')}
                                    disabled={index === 0}
                                    className="h-7 w-7"
                                >
                                    <MoveUp size={14} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveImage(img.id, 'down')}
                                    disabled={index === images.length - 1}
                                    className="h-7 w-7"
                                >
                                    <MoveDown size={14} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setEditingImage(img);
                                        setAltInput(img.alt);
                                        setCaptionInput(img.caption || '');
                                        setShowModal(true);
                                    }}
                                    className="h-7 w-7"
                                >
                                    <Edit size={14} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteImage(img.id)}
                                    className="h-7 w-7 text-red-400"
                                >
                                    <Trash size={14} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="p-6 text-center text-gray-500">
                        <Image className="mx-auto mb-2" size={32} />
                        <p className="text-sm">No images embedded yet</p>
                        <p className="text-xs">Add images to enhance your content</p>
                    </div>
                </Card>
            )}

            <ImageSelector
                isOpen={showLibrary}
                onClose={() => setShowLibrary(false)}
                onSelect={handleLibrarySelect}
                tenantId={tenantId}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingImage ? 'Edit Image' : 'Add Image'}
                size="lg"
            >
                {editingImage ? (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <img
                                src={editingImage.url}
                                alt={editingImage.alt}
                                className="max-h-48 rounded"
                            />
                        </div>
                        <Input
                            label="Alt Text"
                            value={altInput}
                            onChange={(e) => setAltInput(e.target.value)}
                            placeholder="Describe the image"
                        />
                        <Input
                            label="Caption (optional)"
                            value={captionInput}
                            onChange={(e) => setCaptionInput(e.target.value)}
                            placeholder="Image caption"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button onClick={() => {
                                updateImage(editingImage.id, { alt: altInput, caption: captionInput });
                                closeModal();
                            }}>
                                <Check size={16} /> Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Mode Tabs */}
                        <div className="flex gap-2 border-b border-gray-700 pb-3">
                            <button
                                onClick={() => { setShowLibrary(true); closeModal(); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors text-gray-400 hover:text-white"
                            >
                                <Image size={14} />
                                Library
                            </button>
                            {[
                                { id: 'url', label: 'From URL', icon: Link },
                                { id: 'upload', label: 'Upload', icon: Upload },
                            ].map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setUploadMode(id as any)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${uploadMode === id
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {label}
                                </button>
                            ))}
                        </div>


                        {/* URL Mode */}
                        {uploadMode === 'url' && (
                            <div className="space-y-3">
                                <Input
                                    label="Image URL"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                />
                                <Input
                                    label="Alt Text"
                                    value={altInput}
                                    onChange={(e) => setAltInput(e.target.value)}
                                    placeholder="Describe the image"
                                />
                                <Input
                                    label="Caption (optional)"
                                    value={captionInput}
                                    onChange={(e) => setCaptionInput(e.target.value)}
                                    placeholder="Image caption"
                                />
                                <Button onClick={handleUrlSubmit} disabled={!urlInput.trim()} className="w-full">
                                    <Plus size={16} /> Add Image
                                </Button>
                            </div>
                        )}

                        {/* Upload Mode */}
                        {uploadMode === 'upload' && (
                            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                                <Upload className="mx-auto mb-4 text-gray-500" size={48} />
                                <p className="text-gray-400 mb-2">Drag and drop an image here</p>
                                <p className="text-gray-500 text-sm">or</p>
                                <Button variant="secondary" className="mt-2">
                                    Browse Files
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
