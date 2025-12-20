// AI Image Generation Interface
import { useState } from 'react';
import { Wand2, Download } from 'lucide-react';
import { Button, Textarea, Modal } from './ui';
import api from '../lib/api';

interface GeneratedImage {
    url: string;
    prompt: string;
    created_at: string;
}

interface AIImageGeneratorProps {
    tenantId: number;
    onImageGenerated?: (imageUrl: string) => void;
}

const STYLE_PRESETS = [
    { id: 'photorealistic', label: 'Photorealistic', suffix: ', photorealistic, 8k, detailed' },
    { id: 'illustration', label: 'Illustration', suffix: ', digital illustration, vibrant colors' },
    { id: 'minimalist', label: 'Minimalist', suffix: ', minimalist design, clean, simple' },
    { id: '3d', label: '3D Render', suffix: ', 3d render, octane render, studio lighting' },
    { id: 'watercolor', label: 'Watercolor', suffix: ', watercolor painting, artistic' },
    { id: 'anime', label: 'Anime', suffix: ', anime style, detailed' },
];

const ASPECT_RATIOS = [
    { id: '1:1', label: 'Square (1:1)', width: 1024, height: 1024 },
    { id: '16:9', label: 'Landscape (16:9)', width: 1024, height: 576 },
    { id: '9:16', label: 'Portrait (9:16)', width: 576, height: 1024 },
    { id: '4:3', label: 'Standard (4:3)', width: 1024, height: 768 },
];

export default function AIImageGenerator({ tenantId, onImageGenerated }: AIImageGeneratorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('photorealistic');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [loading, setLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const style = STYLE_PRESETS.find(s => s.id === selectedStyle);
            const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio);

            const fullPrompt = prompt + (style?.suffix || '');

            const response = await api.post('/images/generate', {
                tenant_id: tenantId,
                prompt: fullPrompt,
                negative_prompt: negativePrompt,
                width: ratio?.width || 1024,
                height: ratio?.height || 1024,
            });

            if (response.data.success) {
                const newImage: GeneratedImage = {
                    url: response.data.image_url,
                    prompt: fullPrompt,
                    created_at: new Date().toISOString(),
                };
                setGeneratedImages(prev => [newImage, ...prev]);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate image');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (imageUrl: string) => {
        onImageGenerated?.(imageUrl);
        setIsOpen(false);
    };

    const handleDownload = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `generated-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Wand2 size={16} /> AI Generate
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="AI Image Generator"
                size="lg"
            >
                <div className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Prompt Input */}
                    <Textarea
                        label="Image Prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="A professional office space with natural lighting, modern furniture..."
                        hint="Describe what you want to see in the image"
                    />

                    <Textarea
                        label="Negative Prompt (optional)"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="blurry, low quality, distorted..."
                        hint="Describe what you don't want to see"
                    />

                    {/* Style Presets */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
                        <div className="flex flex-wrap gap-2">
                            {STYLE_PRESETS.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style.id)}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedStyle === style.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                        <div className="flex flex-wrap gap-2">
                            {ASPECT_RATIOS.map((ratio) => (
                                <button
                                    key={ratio.id}
                                    onClick={() => setAspectRatio(ratio.id)}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${aspectRatio === ratio.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {ratio.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <Button onClick={handleGenerate} loading={loading} className="w-full" size="lg">
                        {loading ? (
                            <>Generating...</>
                        ) : (
                            <>
                                <Wand2 size={18} /> Generate Image
                            </>
                        )}
                    </Button>

                    {/* Generated Images */}
                    {generatedImages.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Generated Images</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {generatedImages.map((img, index) => (
                                    <div
                                        key={index}
                                        className="relative group rounded-lg overflow-hidden border border-gray-700"
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.prompt}
                                            className="w-full aspect-square object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button size="sm" onClick={() => handleSelect(img.url)}>
                                                Use Image
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDownload(img.url)}>
                                                <Download size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}
