// Autosave Hook for Content Editor
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';

interface AutosaveOptions {
    contentId: number;
    debounceMs?: number;
    onSaveStart?: () => void;
    onSaveSuccess?: (data: any) => void;
    onSaveError?: (error: any) => void;
}

interface AutosaveState {
    isSaving: boolean;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;
    error: string | null;
}

export function useAutosave({
    contentId,
    debounceMs = 3000,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
}: AutosaveOptions) {
    const [state, setState] = useState<AutosaveState>({
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
        error: null,
    });

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingContentRef = useRef<string | null>(null);

    const saveContent = useCallback(async (content: string) => {
        if (!content || !contentId) return;

        setState(prev => ({ ...prev, isSaving: true, error: null }));
        onSaveStart?.();

        try {
            const response = await api.post(`/posts/${contentId}/autosave`, {
                content,
                saved_at: new Date().toISOString(),
            });

            if (response.data.success) {
                setState(prev => ({
                    ...prev,
                    isSaving: false,
                    lastSaved: new Date(),
                    hasUnsavedChanges: false,
                }));
                onSaveSuccess?.(response.data);
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Autosave failed';
            setState(prev => ({
                ...prev,
                isSaving: false,
                error: errorMessage,
            }));
            onSaveError?.(error);
        }
    }, [contentId, onSaveStart, onSaveSuccess, onSaveError]);

    const scheduleAutosave = useCallback((content: string) => {
        pendingContentRef.current = content;
        setState(prev => ({ ...prev, hasUnsavedChanges: true }));

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Schedule new save
        timeoutRef.current = setTimeout(() => {
            if (pendingContentRef.current) {
                saveContent(pendingContentRef.current);
            }
        }, debounceMs);
    }, [debounceMs, saveContent]);

    const saveNow = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (pendingContentRef.current) {
            saveContent(pendingContentRef.current);
        }
    }, [saveContent]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Save before page unload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (state.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [state.hasUnsavedChanges]);

    return {
        ...state,
        scheduleAutosave,
        saveNow,
    };
}

// Autosave Status Indicator Component
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react';

interface AutosaveIndicatorProps {
    isSaving: boolean;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;
    error: string | null;
}

export function AutosaveIndicator({
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    error,
}: AutosaveIndicatorProps) {
    const formatLastSaved = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);

        if (minutes > 0) return `${minutes}m ago`;
        if (seconds > 10) return `${seconds}s ago`;
        return 'Just now';
    };

    if (error) {
        return (
            <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} />
                <span>Save failed</span>
            </div>
        );
    }

    if (isSaving) {
        return (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
            </div>
        );
    }

    if (hasUnsavedChanges) {
        return (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <CloudOff size={14} />
                <span>Unsaved changes</span>
            </div>
        );
    }

    if (lastSaved) {
        return (
            <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check size={14} />
                <span>Saved {formatLastSaved(lastSaved)}</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Cloud size={14} />
            <span>Autosave enabled</span>
        </div>
    );
}
