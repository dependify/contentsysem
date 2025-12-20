// Content Preview Mode (Desktop/Mobile)
import { useState } from 'react';
import { Monitor, Smartphone, Tablet, Maximize2, Eye } from 'lucide-react';
import { Button, Modal } from './ui';

interface ContentPreviewProps {
    content: string;
    title: string;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const VIEW_MODES: { id: ViewMode; icon: any; label: string; width: string }[] = [
    { id: 'desktop', icon: Monitor, label: 'Desktop', width: '100%' },
    { id: 'tablet', icon: Tablet, label: 'Tablet', width: '768px' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile', width: '375px' },
];

export default function ContentPreview({ content, title }: ContentPreviewProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('desktop');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const parseContent = (markdown: string): string => {
        return markdown
            // Headers
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
            // Bold and Italic
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
            // Lists
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-6 my-2">$&</ul>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p class="mb-4">')
            .replace(/\n/g, '<br />');
    };

    const currentMode = VIEW_MODES.find(m => m.id === viewMode)!;

    return (
        <>
            <Button variant="ghost" onClick={() => setIsOpen(true)}>
                <Eye size={16} /> Preview
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => { setIsOpen(false); setIsFullscreen(false); }}
                title="Content Preview"
                size="xl"
            >
                <div className="flex flex-col h-full">
                    {/* Preview Controls */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            {VIEW_MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setViewMode(mode.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${viewMode === mode.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                        }`}
                                >
                                    <mode.icon size={16} />
                                    <span className="text-sm">{mode.label}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <Maximize2 size={18} />
                        </button>
                    </div>

                    {/* Preview Container */}
                    <div className="flex-1 bg-gray-900 p-8 overflow-auto flex justify-center">
                        <div
                            className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
                            style={{
                                width: currentMode.width,
                                maxWidth: '100%',
                                minHeight: viewMode === 'mobile' ? '600px' : viewMode === 'tablet' ? '800px' : 'auto'
                            }}
                        >
                            {/* Mock Browser Chrome */}
                            <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="bg-white rounded px-3 py-1 text-sm text-gray-500 border">
                                        https://yourblog.com/posts/preview
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className={`p-6 ${viewMode === 'mobile' ? 'p-4' : 'p-8'}`}>
                                <article className="prose max-w-none">
                                    <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
                                    <div
                                        className="text-gray-700"
                                        dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${parseContent(content)}</p>` }}
                                    />
                                </article>
                            </div>
                        </div>
                    </div>

                    {/* Device Info */}
                    <div className="p-3 border-t border-gray-700 text-center text-sm text-gray-500">
                        {currentMode.label} view ({currentMode.width})
                    </div>
                </div>
            </Modal>
        </>
    );
}
