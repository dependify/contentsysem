// Batch Actions component for content queue
import { useState } from 'react';
import { Pause, Play, RotateCcw, Trash, X, CheckSquare, Square } from 'lucide-react';
import { Button, ConfirmDialog } from './ui';
import api from '../lib/api';

interface BatchActionsProps {
    selectedIds: number[];
    onClearSelection: () => void;
    onSelectAll: () => void;
    totalItems: number;
    onActionComplete: () => void;
}

export default function BatchActions({
    selectedIds,
    onClearSelection,
    onSelectAll,
    totalItems,
    onActionComplete,
}: BatchActionsProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'pause' | 'cancel' | 'retry' | 'delete';
        title: string;
        message: string;
    } | null>(null);

    const handleAction = async (action: string) => {
        if (selectedIds.length === 0) return;

        setLoading(action);
        try {
            let endpoint = '';
            switch (action) {
                case 'pause':
                    endpoint = '/content/batch/pause';
                    break;
                case 'resume':
                    endpoint = '/content/batch/resume';
                    break;
                case 'retry':
                    endpoint = '/content/batch/retry';
                    break;
                case 'delete':
                    endpoint = '/content/batch/delete';
                    break;
            }

            await api.post(endpoint, { ids: selectedIds });
            onActionComplete();
            onClearSelection();
        } catch (error) {
            console.error(`Batch ${action} failed:`, error);
        } finally {
            setLoading(null);
            setConfirmAction(null);
        }
    };

    const confirmAndExecute = (action: 'pause' | 'cancel' | 'retry' | 'delete') => {
        const configs: Record<string, { title: string; message: string }> = {
            pause: {
                title: 'Pause Selected Items',
                message: `Are you sure you want to pause ${selectedIds.length} item(s)? They will stop processing until resumed.`,
            },
            cancel: {
                title: 'Cancel Selected Items',
                message: `Are you sure you want to cancel ${selectedIds.length} item(s)? This cannot be undone.`,
            },
            retry: {
                title: 'Retry Failed Items',
                message: `Are you sure you want to retry ${selectedIds.length} item(s)? They will be requeued for processing.`,
            },
            delete: {
                title: 'Delete Selected Items',
                message: `Are you sure you want to delete ${selectedIds.length} item(s)? This action cannot be undone.`,
            },
        };

        setConfirmAction({ type: action, ...configs[action] });
    };

    if (selectedIds.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <button
                    onClick={onSelectAll}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                >
                    <Square size={16} />
                    Select all
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center gap-3 p-3 bg-indigo-600/20 border border-indigo-600/30 rounded-lg">
                {/* Selection Info */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSelectAll}
                        className="text-indigo-400 hover:text-white transition-colors"
                        title={selectedIds.length === totalItems ? 'Deselect all' : 'Select all'}
                    >
                        <CheckSquare size={18} />
                    </button>
                    <span className="text-indigo-300 text-sm font-medium">
                        {selectedIds.length} selected
                    </span>
                    <button
                        onClick={onClearSelection}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="w-px h-6 bg-indigo-600/50" />

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmAndExecute('pause')}
                        loading={loading === 'pause'}
                    >
                        <Pause size={14} /> Pause
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction('resume')}
                        loading={loading === 'resume'}
                    >
                        <Play size={14} /> Resume
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmAndExecute('retry')}
                        loading={loading === 'retry'}
                    >
                        <RotateCcw size={14} /> Retry
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => confirmAndExecute('delete')}
                        loading={loading === 'delete'}
                    >
                        <Trash size={14} /> Delete
                    </Button>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmAction !== null}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => confirmAction && handleAction(confirmAction.type)}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                confirmText={confirmAction?.type === 'delete' ? 'Delete' : 'Confirm'}
                variant={confirmAction?.type === 'delete' ? 'danger' : 'primary'}
            />
        </>
    );
}
