// Markdown Editor with Preview
import { useState, useCallback } from 'react';
import { Eye, Edit3, Columns, Copy, Download } from 'lucide-react';


interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: number;
}

export default function MarkdownEditor({
    value,
    onChange,
    placeholder = 'Write in Markdown...',
    minHeight = 400,
}: MarkdownEditorProps) {
    const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');

    const parseMarkdown = useCallback((md: string): string => {
        // Simple markdown parser
        let html = md
            // Escape HTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Headers
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
            // Bold and Italic
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            .replace(/_(.+?)_/g, '<em>$1</em>')
            // Strikethrough
            .replace(/~~(.+?)~~/g, '<del>$1</del>')
            // Code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-800 p-3 rounded my-2 overflow-x-auto"><code>$2</code></pre>')
            // Inline code
            .replace(/`(.+?)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-400 hover:underline" target="_blank">$1</a>')
            // Images
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded my-2" />')
            // Blockquotes
            .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-indigo-500 pl-4 italic text-gray-400">$1</blockquote>')
            // Unordered lists
            .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
            .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>')
            // Ordered lists
            .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
            // Horizontal rule
            .replace(/^---$/gm, '<hr class="border-gray-700 my-4" />')
            // Paragraphs
            .replace(/\n\n/g, '</p><p class="mb-3">')
            .replace(/\n/g, '<br />');

        return `<p class="mb-3">${html}</p>`;
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
    };

    const handleDownload = () => {
        const blob = new Blob([value], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'content.md';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setViewMode('edit')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'edit' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        title="Edit mode"
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('split')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'split' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        title="Split view"
                    >
                        <Columns size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('preview')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'preview' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        title="Preview mode"
                    >
                        <Eye size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
                        title="Copy markdown"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={handleDownload}
                        className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
                        title="Download as .md"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex ${viewMode === 'split' ? 'divide-x divide-gray-700' : ''}`}>
                {/* Editor */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={`p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none outline-none ${viewMode === 'split' ? 'w-1/2' : 'w-full'
                            }`}
                        style={{ minHeight }}
                    />
                )}

                {/* Preview */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div
                        className={`p-4 bg-gray-900 text-gray-100 overflow-y-auto prose prose-invert max-w-none ${viewMode === 'split' ? 'w-1/2' : 'w-full'
                            }`}
                        style={{ minHeight }}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }}
                    />
                )}
            </div>

            {/* Word Count */}
            <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-500 flex items-center gap-4">
                <span>{value.length} characters</span>
                <span>{value.split(/\s+/).filter(Boolean).length} words</span>
                <span>{value.split('\n').length} lines</span>
            </div>
        </div>
    );
}
