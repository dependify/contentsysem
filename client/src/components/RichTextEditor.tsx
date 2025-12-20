// Rich Text Editor component using contenteditable
import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Bold, Italic, Underline, Strikethrough, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, Link, Image, Code,
    Heading1, Heading2, Heading3, Quote, Undo, Redo, Maximize2
} from 'lucide-react';


interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: number;
    onImageInsert?: () => void;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Start writing...',
    minHeight = 400,
    onImageInsert,
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, []);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    const formatBlock = (tag: string) => {
        document.execCommand('formatBlock', false, tag);
        editorRef.current?.focus();
        handleInput();
    };

    const insertLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            execCommand('createLink', url);
        }
    };

    const ToolbarButton = ({
        icon: Icon,
        command,
        value,
        title
    }: {
        icon: any;
        command?: string;
        value?: string;
        title: string;
    }) => (
        <button
            type="button"
            onClick={() => command && execCommand(command, value)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={title}
        >
            <Icon size={16} />
        </button>
    );

    const ToolbarDivider = () => (
        <div className="w-px h-6 bg-gray-700 mx-1" />
    );

    return (
        <div className={`border border-gray-700 rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50 bg-gray-900' : ''}`}>
            {/* Toolbar */}
            <div className="flex items-center flex-wrap gap-0.5 p-2 bg-gray-800 border-b border-gray-700">
                {/* History */}
                <ToolbarButton icon={Undo} command="undo" title="Undo" />
                <ToolbarButton icon={Redo} command="redo" title="Redo" />

                <ToolbarDivider />

                {/* Headings */}
                <button
                    type="button"
                    onClick={() => formatBlock('h1')}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Heading 1"
                >
                    <Heading1 size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => formatBlock('h2')}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Heading 2"
                >
                    <Heading2 size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => formatBlock('h3')}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Heading 3"
                >
                    <Heading3 size={16} />
                </button>

                <ToolbarDivider />

                {/* Text formatting */}
                <ToolbarButton icon={Bold} command="bold" title="Bold" />
                <ToolbarButton icon={Italic} command="italic" title="Italic" />
                <ToolbarButton icon={Underline} command="underline" title="Underline" />
                <ToolbarButton icon={Strikethrough} command="strikeThrough" title="Strikethrough" />

                <ToolbarDivider />

                {/* Lists */}
                <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
                <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />
                <button
                    type="button"
                    onClick={() => formatBlock('blockquote')}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Quote"
                >
                    <Quote size={16} />
                </button>

                <ToolbarDivider />

                {/* Alignment */}
                <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" />
                <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" />
                <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" />

                <ToolbarDivider />

                {/* Insert */}
                <button
                    type="button"
                    onClick={insertLink}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Insert Link"
                >
                    <Link size={16} />
                </button>
                {onImageInsert && (
                    <button
                        type="button"
                        onClick={onImageInsert}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Insert Image"
                    >
                        <Image size={16} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => formatBlock('pre')}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Code Block"
                >
                    <Code size={16} />
                </button>

                <div className="flex-1" />

                {/* Fullscreen */}
                <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Fullscreen"
                >
                    <Maximize2 size={16} />
                </button>
            </div>

            {/* Editor */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="p-4 outline-none overflow-y-auto bg-gray-900 text-gray-100 prose prose-invert max-w-none"
                style={{ minHeight: isFullscreen ? 'calc(100% - 50px)' : minHeight }}
                data-placeholder={placeholder}
            />

            <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #6b7280;
          pointer-events: none;
        }
        .prose h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
        .prose h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
        .prose h3 { font-size: 1.25em; font-weight: bold; margin-bottom: 0.5em; }
        .prose p { margin-bottom: 1em; }
        .prose ul, .prose ol { margin-left: 1.5em; margin-bottom: 1em; }
        .prose li { margin-bottom: 0.25em; }
        .prose blockquote { 
          border-left: 3px solid #6366f1; 
          padding-left: 1em; 
          color: #9ca3af;
          font-style: italic;
        }
        .prose pre {
          background: #1f2937;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
        }
        .prose a { color: #818cf8; text-decoration: underline; }
      `}</style>
        </div>
    );
}
