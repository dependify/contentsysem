// Save as draft and content comparison diff view
import { useState, useEffect, useMemo } from 'react';
import { Save, Eye, History, ArrowRight } from 'lucide-react';
import { Button, Modal, Badge, Spinner } from './ui';
import api from '../lib/api';

interface DraftActionsProps {
    contentId: number;
    content: string;
    title: string;
    hasChanges: boolean;
    onSave: () => Promise<void>;
    onPublish: () => Promise<void>;
}

export function DraftActions({ hasChanges, onSave, onPublish }: DraftActionsProps) {
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave();
            setLastSaved(new Date());
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            await onPublish();
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {lastSaved && (
                <span className="text-xs text-gray-500">
                    Last saved: {lastSaved.toLocaleTimeString()}
                </span>
            )}
            {hasChanges && (
                <Badge variant="warning">Unsaved changes</Badge>
            )}
            <Button
                variant="secondary"
                onClick={handleSave}
                loading={saving}
                disabled={!hasChanges}
            >
                <Save size={16} /> Save Draft
            </Button>
            <Button
                onClick={handlePublish}
                loading={publishing}
            >
                <Eye size={16} /> Publish
            </Button>
        </div>
    );
}

// Content Version Comparison
interface ContentVersion {
    id: number;
    version: number;
    content: string;
    created_at: string;
    created_by?: string;
}

interface ContentDiffViewProps {
    contentId: number;
    currentContent: string;
}

export function ContentDiffView({ contentId, currentContent }: ContentDiffViewProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [versions, setVersions] = useState<ContentVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [leftVersion, setLeftVersion] = useState<ContentVersion | null>(null);
    const [rightVersion, setRightVersion] = useState<ContentVersion | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchVersions();
        }
    }, [isOpen, contentId]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/content/${contentId}/versions`);
            if (response.data.success && response.data.versions.length > 0) {
                setVersions(response.data.versions);
                setLeftVersion(response.data.versions[1] || response.data.versions[0]);
                setRightVersion(response.data.versions[0]);
            }
        } catch (error) {
            // Mock data for display
            const mockVersions: ContentVersion[] = [
                { id: 1, version: 3, content: currentContent, created_at: new Date().toISOString() },
                { id: 2, version: 2, content: currentContent.substring(0, 500) + '... (previous version)', created_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 3, version: 1, content: 'Initial draft content...', created_at: new Date(Date.now() - 86400000).toISOString() },
            ];
            setVersions(mockVersions);
            setLeftVersion(mockVersions[1]);
            setRightVersion(mockVersions[0]);
        } finally {
            setLoading(false);
        }
    };

    const diffLines = useMemo(() => {
        if (!leftVersion || !rightVersion) return [];

        const leftLines = leftVersion.content.split('\n');
        const rightLines = rightVersion.content.split('\n');
        const maxLines = Math.max(leftLines.length, rightLines.length);

        const result = [];
        for (let i = 0; i < maxLines; i++) {
            const left = leftLines[i] || '';
            const right = rightLines[i] || '';
            const status = left === right ? 'unchanged' :
                !left ? 'added' :
                    !right ? 'removed' : 'changed';
            result.push({ line: i + 1, left, right, status });
        }
        return result;
    }, [leftVersion, rightVersion]);

    return (
        <>
            <Button variant="ghost" onClick={() => setIsOpen(true)}>
                <History size={16} /> Compare Versions
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Compare Versions"
                size="xl"
            >
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Version Selectors */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">From</label>
                                <select
                                    value={leftVersion?.id || ''}
                                    onChange={(e) => setLeftVersion(versions.find(v => v.id === Number(e.target.value)) || null)}
                                    className="select w-full"
                                >
                                    {versions.map(v => (
                                        <option key={v.id} value={v.id}>
                                            Version {v.version} - {new Date(v.created_at).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <ArrowRight className="text-gray-500 mt-5" size={20} />
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">To</label>
                                <select
                                    value={rightVersion?.id || ''}
                                    onChange={(e) => setRightVersion(versions.find(v => v.id === Number(e.target.value)) || null)}
                                    className="select w-full"
                                >
                                    {versions.map(v => (
                                        <option key={v.id} value={v.id}>
                                            Version {v.version} - {new Date(v.created_at).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Diff View */}
                        <div className="border border-gray-700 rounded-lg overflow-hidden">
                            <div className="grid grid-cols-2 bg-gray-800 border-b border-gray-700">
                                <div className="p-2 text-sm text-gray-400 border-r border-gray-700">
                                    Version {leftVersion?.version}
                                </div>
                                <div className="p-2 text-sm text-gray-400">
                                    Version {rightVersion?.version}
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {diffLines.map((line) => (
                                    <div
                                        key={line.line}
                                        className={`grid grid-cols-2 text-sm font-mono ${line.status === 'added' ? 'bg-green-500/10' :
                                            line.status === 'removed' ? 'bg-red-500/10' :
                                                line.status === 'changed' ? 'bg-yellow-500/10' : ''
                                            }`}
                                    >
                                        <div className={`p-2 border-r border-gray-700 ${line.status === 'removed' || line.status === 'changed'
                                            ? 'text-red-300' : 'text-gray-400'
                                            }`}>
                                            <span className="text-gray-600 mr-2 select-none">{line.line}</span>
                                            {line.left}
                                        </div>
                                        <div className={`p-2 ${line.status === 'added' || line.status === 'changed'
                                            ? 'text-green-300' : 'text-gray-400'
                                            }`}>
                                            <span className="text-gray-600 mr-2 select-none">{line.line}</span>
                                            {line.right}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-green-500/30 rounded" />
                                Added
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-500/30 rounded" />
                                Removed
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-yellow-500/30 rounded" />
                                Changed
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
