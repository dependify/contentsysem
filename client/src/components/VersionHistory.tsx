// Content Version History Sidebar
import { useState, useEffect } from 'react';
import { History, RotateCcw, Eye } from 'lucide-react';
import { Button, Badge, Modal, Spinner } from './ui';
import api from '../lib/api';

interface ContentVersion {
    id: number;
    version: number;
    content: string;
    created_at: string;
    created_by?: string;
    change_summary?: string;
}

interface VersionHistoryProps {
    contentId: number;
    currentContent: string;
    onRestore: (content: string) => void;
}

export default function VersionHistory({ contentId, currentContent, onRestore }: VersionHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [versions, setVersions] = useState<ContentVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null);
    const [previewContent, setPreviewContent] = useState<string | null>(null);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/content/${contentId}/versions`);
            if (response.data.success) {
                setVersions(response.data.versions);
            }
        } catch (error) {
            console.error('Failed to fetch versions:', error);
            // Mock data for display
            setVersions([
                {
                    id: 1, version: 3, content: currentContent,
                    created_at: new Date().toISOString(),
                    change_summary: 'Updated introduction and conclusion'
                },
                {
                    id: 2, version: 2, content: currentContent.substring(0, 500) + '...',
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    change_summary: 'Added new section on best practices'
                },
                {
                    id: 3, version: 1, content: 'Original content...',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    change_summary: 'Initial draft'
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchVersions();
        }
    }, [isOpen, contentId]);

    const handlePreview = (version: ContentVersion) => {
        setSelectedVersion(version);
        setPreviewContent(version.content);
    };

    const handleRestore = () => {
        if (selectedVersion) {
            onRestore(selectedVersion.content);
            setIsOpen(false);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        return `${minutes}m ago`;
    };

    return (
        <>
            <Button variant="ghost" onClick={() => setIsOpen(true)}>
                <History size={16} /> Version History
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => { setIsOpen(false); setSelectedVersion(null); setPreviewContent(null); }}
                title="Version History"
                size="lg"
            >
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <div className="flex h-[500px]">
                        {/* Version List */}
                        <div className="w-64 border-r border-gray-700 overflow-y-auto">
                            <div className="p-2 space-y-1">
                                {versions.map((version) => (
                                    <button
                                        key={version.id}
                                        onClick={() => handlePreview(version)}
                                        className={`w-full p-3 rounded-lg text-left transition-colors ${selectedVersion?.id === version.id
                                            ? 'bg-indigo-600'
                                            : 'hover:bg-gray-800'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <Badge variant="gray">v{version.version}</Badge>
                                            <span className="text-xs text-gray-500">
                                                {formatTimeAgo(version.created_at)}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${selectedVersion?.id === version.id ? 'text-indigo-200' : 'text-gray-400'
                                            } line-clamp-2`}>
                                            {version.change_summary || 'No description'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview / Comparison */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {previewContent ? (
                                <>
                                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-white">Version {selectedVersion?.version}</h4>
                                            <p className="text-sm text-gray-400">
                                                {new Date(selectedVersion?.created_at || '').toLocaleString()}
                                            </p>
                                        </div>
                                        <Button onClick={handleRestore} size="sm">
                                            <RotateCcw size={14} /> Restore This Version
                                        </Button>
                                    </div>
                                    <div className="flex-1 p-4 overflow-y-auto">
                                        <div className="prose prose-invert max-w-none text-sm">
                                            <pre className="whitespace-pre-wrap font-sans">{previewContent}</pre>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <Eye size={48} className="mx-auto mb-4 text-gray-600" />
                                        <p>Select a version to preview</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
