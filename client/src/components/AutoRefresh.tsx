// Auto-refresh hook for real-time updates
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoRefreshOptions {
    interval?: number; // in milliseconds
    enabled?: boolean;
    onRefresh: () => Promise<void> | void;
}

export function useAutoRefresh({
    interval = 5000,
    enabled = true,
    onRefresh,
}: UseAutoRefreshOptions) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(enabled);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const refresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await onRefresh();
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [onRefresh]);

    useEffect(() => {
        if (!autoRefreshEnabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial refresh
        refresh();

        // Set up interval
        intervalRef.current = setInterval(refresh, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoRefreshEnabled, interval, refresh]);

    const toggleAutoRefresh = useCallback(() => {
        setAutoRefreshEnabled(prev => !prev);
    }, []);

    const manualRefresh = useCallback(async () => {
        await refresh();
    }, [refresh]);

    return {
        isRefreshing,
        lastRefresh,
        autoRefreshEnabled,
        toggleAutoRefresh,
        manualRefresh,
    };
}

// Component for displaying auto-refresh status
import { RefreshCw, Pause } from 'lucide-react';
import { Button } from './ui';

interface AutoRefreshIndicatorProps {
    isRefreshing: boolean;
    lastRefresh: Date | null;
    autoRefreshEnabled: boolean;
    onToggle: () => void;
    onManualRefresh: () => void;
}

export function AutoRefreshIndicator({
    isRefreshing,
    lastRefresh,
    autoRefreshEnabled,
    onToggle,
    onManualRefresh,
}: AutoRefreshIndicatorProps) {
    const formatLastRefresh = () => {
        if (!lastRefresh) return 'Never';
        const seconds = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ago`;
    };

    return (
        <div className="flex items-center gap-2 text-sm">
            <Button
                variant="ghost"
                size="sm"
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="gap-1"
            >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
            </Button>

            <button
                onClick={onToggle}
                className={`flex items-center gap-1 px-2 py-1 rounded ${autoRefreshEnabled
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-700 text-gray-500'
                    } transition-colors`}
                title={autoRefreshEnabled ? 'Auto-refresh is ON' : 'Auto-refresh is OFF'}
            >
                {autoRefreshEnabled ? (
                    <>
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-xs">Live</span>
                    </>
                ) : (
                    <>
                        <Pause size={12} />
                        <span className="text-xs">Paused</span>
                    </>
                )}
            </button>

            <span className="text-gray-500 text-xs">
                Updated {formatLastRefresh()}
            </span>
        </div>
    );
}
