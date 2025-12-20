// Image Lightbox Viewer
import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Info } from 'lucide-react';
import { Button } from './ui';

interface LightboxImage {
    id: number;
    url: string;
    filename: string;
    alt_text?: string;
    width?: number;
    height?: number;
    size?: number;
    created_at?: string;
}

interface ImageLightboxProps {
    images: LightboxImage[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex, isOpen, onClose }: ImageLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        setCurrentIndex(initialIndex);
        setZoom(1);
    }, [initialIndex, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    navigatePrev();
                    break;
                case 'ArrowRight':
                    navigateNext();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const navigatePrev = useCallback(() => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
        setZoom(1);
    }, [images.length]);

    const navigateNext = useCallback(() => {
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
        setZoom(1);
    }, [images.length]);

    const handleDownload = () => {
        const image = images[currentIndex];
        const a = document.createElement('a');
        a.href = image.url;
        a.download = image.filename;
        a.click();
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!isOpen || images.length === 0) return null;

    const currentImage = images[currentIndex];

    return (
        <div className="fixed inset-0 z-50 bg-black/95">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
                <div className="text-white">
                    <span className="text-sm text-gray-400">
                        {currentIndex + 1} / {images.length}
                    </span>
                    <h3 className="font-medium truncate max-w-md">{currentImage.filename}</h3>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                        <ZoomOut size={18} />
                    </Button>
                    <span className="text-sm text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                        <ZoomIn size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowInfo(!showInfo)}>
                        <Info size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleDownload}>
                        <Download size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={18} />
                    </Button>
                </div>
            </div>

            {/* Navigation */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={navigatePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={navigateNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Image */}
            <div className="absolute inset-0 flex items-center justify-center pt-16 pb-4 px-16">
                <img
                    src={currentImage.url}
                    alt={currentImage.alt_text || currentImage.filename}
                    className="max-h-full max-w-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoom})` }}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            {/* Info Panel */}
            {showInfo && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex flex-wrap gap-6 text-sm text-gray-300">
                        <div>
                            <span className="text-gray-500">Filename:</span>
                            <span className="ml-2">{currentImage.filename}</span>
                        </div>
                        {currentImage.width && currentImage.height && (
                            <div>
                                <span className="text-gray-500">Dimensions:</span>
                                <span className="ml-2">{currentImage.width} × {currentImage.height}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500">Size:</span>
                            <span className="ml-2">{formatFileSize(currentImage.size)}</span>
                        </div>
                        {currentImage.alt_text && (
                            <div>
                                <span className="text-gray-500">Alt text:</span>
                                <span className="ml-2">{currentImage.alt_text}</span>
                            </div>
                        )}
                        {currentImage.created_at && (
                            <div>
                                <span className="text-gray-500">Uploaded:</span>
                                <span className="ml-2">{new Date(currentImage.created_at).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Thumbnail Strip */}
            {images.length > 1 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg">
                    {images.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((img, idx) => {
                        const actualIdx = Math.max(0, currentIndex - 3) + idx;
                        return (
                            <button
                                key={img.id}
                                onClick={() => { setCurrentIndex(actualIdx); setZoom(1); }}
                                className={`w-12 h-12 rounded overflow-hidden border-2 transition-colors ${actualIdx === currentIndex ? 'border-indigo-500' : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                            >
                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
