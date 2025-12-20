// Simple image editing (crop, resize)
import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Crop, Maximize2, RotateCw, FlipHorizontal, FlipVertical,
    Download, X, Check, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { Button, Modal, Spinner } from './ui';

interface ImageEditorProps {
    imageUrl: string;
    onSave: (editedImageBlob: Blob) => Promise<void>;
    onClose: () => void;
    isOpen: boolean;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

const ASPECT_RATIOS = [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '16:9', value: 16 / 9 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:2', value: 3 / 2 },
];

export default function ImageEditor({ imageUrl, onSave, onClose, isOpen }: ImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [cropMode, setCropMode] = useState(false);
    const [cropArea, setCropArea] = useState<CropArea | null>(null);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (isOpen && imageUrl) {
            loadImage();
        }
    }, [isOpen, imageUrl]);

    const loadImage = () => {
        setLoading(true);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageRef.current = img;
            setOriginalDimensions({ width: img.width, height: img.height });
            setLoading(false);
            drawImage();
        };
        img.onerror = () => {
            setLoading(false);
        };
        img.src = imageUrl;
    };

    const drawImage = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate canvas size based on rotation
        const isRotated = rotation === 90 || rotation === 270;
        const displayWidth = isRotated ? img.height : img.width;
        const displayHeight = isRotated ? img.width : img.height;

        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply transformations
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // Draw crop overlay
        if (cropMode && cropArea) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

            // Crop border
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

            // Grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            const thirdW = cropArea.width / 3;
            const thirdH = cropArea.height / 3;
            ctx.beginPath();
            ctx.moveTo(cropArea.x + thirdW, cropArea.y);
            ctx.lineTo(cropArea.x + thirdW, cropArea.y + cropArea.height);
            ctx.moveTo(cropArea.x + thirdW * 2, cropArea.y);
            ctx.lineTo(cropArea.x + thirdW * 2, cropArea.y + cropArea.height);
            ctx.moveTo(cropArea.x, cropArea.y + thirdH);
            ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH);
            ctx.moveTo(cropArea.x, cropArea.y + thirdH * 2);
            ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH * 2);
            ctx.stroke();
        }
    }, [rotation, flipH, flipV, zoom, cropMode, cropArea]);

    useEffect(() => {
        drawImage();
    }, [drawImage]);

    const handleRotate = (degrees: number) => {
        setRotation((prev) => (prev + degrees) % 360);
    };

    const startCrop = () => {
        setCropMode(true);
        const canvas = canvasRef.current;
        if (canvas) {
            // Default crop area (center 80%)
            const margin = 0.1;
            setCropArea({
                x: canvas.width * margin,
                y: canvas.height * margin,
                width: canvas.width * (1 - 2 * margin),
                height: canvas.height * (1 - 2 * margin),
            });
        }
    };

    const applyCrop = () => {
        if (!cropArea || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Create cropped canvas
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropArea.width;
        croppedCanvas.height = cropArea.height;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) return;

        croppedCtx.drawImage(
            canvas,
            cropArea.x, cropArea.y, cropArea.width, cropArea.height,
            0, 0, cropArea.width, cropArea.height
        );

        // Update main canvas
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        ctx.drawImage(croppedCanvas, 0, 0);

        setCropMode(false);
        setCropArea(null);
    };

    const resetEdits = () => {
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setZoom(1);
        setCropMode(false);
        setCropArea(null);
        if (imageRef.current) {
            drawImage();
        }
    };

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setSaving(true);
        try {
            canvas.toBlob(async (blob) => {
                if (blob) {
                    await onSave(blob);
                    onClose();
                }
            }, 'image/png');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Image"
            size="xl"
        >
            <div className="flex flex-col h-[600px]">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="flex items-center justify-between p-3 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={cropMode ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={cropMode ? applyCrop : startCrop}
                                >
                                    <Crop size={16} />
                                    {cropMode ? 'Apply Crop' : 'Crop'}
                                </Button>
                                {cropMode && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setCropMode(false); setCropArea(null); }}
                                    >
                                        <X size={16} /> Cancel
                                    </Button>
                                )}

                                <div className="w-px h-6 bg-gray-700 mx-2" />

                                <Button variant="ghost" size="sm" onClick={() => handleRotate(-90)}>
                                    <RotateCcw size={16} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleRotate(90)}>
                                    <RotateCw size={16} />
                                </Button>

                                <div className="w-px h-6 bg-gray-700 mx-2" />

                                <Button
                                    variant={flipH ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFlipH(!flipH)}
                                >
                                    <FlipHorizontal size={16} />
                                </Button>
                                <Button
                                    variant={flipV ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFlipV(!flipV)}
                                >
                                    <FlipVertical size={16} />
                                </Button>

                                <div className="w-px h-6 bg-gray-700 mx-2" />

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                                >
                                    <ZoomOut size={16} />
                                </Button>
                                <span className="text-sm text-gray-400 w-12 text-center">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                                >
                                    <ZoomIn size={16} />
                                </Button>
                            </div>

                            <Button variant="ghost" size="sm" onClick={resetEdits}>
                                Reset
                            </Button>
                        </div>

                        {/* Aspect Ratio Pills (when cropping) */}
                        {cropMode && (
                            <div className="flex items-center gap-2 p-3 border-b border-gray-700">
                                <span className="text-xs text-gray-500">Aspect Ratio:</span>
                                {ASPECT_RATIOS.map(({ label, value }) => (
                                    <button
                                        key={label}
                                        onClick={() => setAspectRatio(value)}
                                        className={`px-2 py-1 text-xs rounded transition-colors ${aspectRatio === value
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Canvas Area */}
                        <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4">
                            <canvas
                                ref={canvasRef}
                                className="max-w-full max-h-full border border-gray-700 rounded"
                                style={{ imageRendering: 'auto' }}
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-3 border-t border-gray-700">
                            <div className="text-sm text-gray-500">
                                {originalDimensions.width} × {originalDimensions.height}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                                <Button onClick={handleSave} loading={saving}>
                                    <Check size={16} /> Save Changes
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
