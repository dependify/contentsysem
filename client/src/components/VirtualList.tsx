// Virtual List Component for Performance Optimization (f94)
// Renders only visible items for large data sets using Intersection Observer

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    itemHeight: number;
    containerHeight?: number;
    overscan?: number;
    className?: string;
    emptyState?: React.ReactNode;
}

export function VirtualList<T>({
    items,
    renderItem,
    itemHeight,
    containerHeight = 400,
    overscan = 3,
    className = '',
    emptyState,
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const totalHeight = items.length * itemHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length, startIndex + visibleCount + 2 * overscan);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const visibleItems = items.slice(startIndex, endIndex);

    if (items.length === 0 && emptyState) {
        return <div className={className}>{emptyState}</div>;
    }

    return (
        <div
            ref={containerRef}
            className={`overflow-auto ${className}`}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
            role="list"
            aria-label={`List with ${items.length} items`}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: startIndex * itemHeight,
                        left: 0,
                        right: 0,
                    }}
                >
                    {visibleItems.map((item, index) => (
                        <div
                            key={startIndex + index}
                            style={{ height: itemHeight }}
                            role="listitem"
                        >
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Lazy Loading List using Intersection Observer (alternative approach)
interface LazyListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    batchSize?: number;
    className?: string;
}

export function LazyList<T>({
    items,
    renderItem,
    batchSize = 20,
    className = '',
}: LazyListProps<T>) {
    const [visibleCount, setVisibleCount] = useState(batchSize);
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < items.length) {
                    setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
                }
            },
            { threshold: 0.1 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [visibleCount, items.length, batchSize]);

    const visibleItems = items.slice(0, visibleCount);

    return (
        <div className={className} role="list">
            {visibleItems.map((item, index) => (
                <div key={index} role="listitem">
                    {renderItem(item, index)}
                </div>
            ))}
            {visibleCount < items.length && (
                <div
                    ref={loaderRef}
                    className="flex justify-center py-4"
                    aria-hidden="true"
                >
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

export default VirtualList;
