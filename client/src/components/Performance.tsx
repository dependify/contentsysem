// Performance optimizations - lazy loading, virtualization, memoization
import React, {
    Suspense,
    lazy,
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    memo
} from 'react';
import { Spinner } from './ui';

// Lazy loading wrapper with fallback
interface LazyComponentProps {
    component: () => Promise<{ default: React.ComponentType<any> }>;
    fallback?: React.ReactNode;
    props?: Record<string, any>;
}

export function LazyComponent({ component, fallback, props = {} }: LazyComponentProps) {
    const Component = lazy(component);

    return (
        <Suspense fallback={fallback || <LoadingFallback />}>
            <Component {...props} />
        </Suspense>
    );
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center p-8">
            <Spinner size="lg" />
        </div>
    );
}

// Virtual list for large datasets
interface VirtualListProps<T> {
    items: T[];
    height: number;
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
}

export function VirtualList<T>({
    items,
    height,
    itemHeight,
    renderItem,
    overscan = 5
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const { visibleItems, startIndex, totalHeight, offsetY } = useMemo(() => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const endIndex = Math.min(
            items.length,
            Math.ceil((scrollTop + height) / itemHeight) + overscan
        );

        return {
            visibleItems: items.slice(startIndex, endIndex),
            startIndex,
            totalHeight: items.length * itemHeight,
            offsetY: startIndex * itemHeight,
        };
    }, [items, scrollTop, height, itemHeight, overscan]);

    return (
        <div
            ref={containerRef}
            style={{ height, overflow: 'auto' }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, i) => (
                        <div key={startIndex + i} style={{ height: itemHeight }}>
                            {renderItem(item, startIndex + i)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Intersection observer for lazy loading images
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    placeholder?: string;
}

export function LazyImage({ src, alt, placeholder, className, ...props }: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <img
            ref={imgRef}
            src={isInView ? src : placeholder || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
            alt={alt}
            className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            {...props}
        />
    );
}

// Debounced value hook
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// Throttled callback hook
export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const lastRun = useRef(Date.now());

    return useCallback(
        ((...args) => {
            if (Date.now() - lastRun.current >= delay) {
                callback(...args);
                lastRun.current = Date.now();
            }
        }) as T,
        [callback, delay]
    );
}

// Memoized list item wrapper
interface MemoizedListItemProps<T> {
    item: T;
    index: number;
    renderItem: (item: T, index: number) => React.ReactNode;
}

function ListItemComponent<T>({ item, index, renderItem }: MemoizedListItemProps<T>) {
    return <>{renderItem(item, index)}</>;
}

export const MemoizedListItem = memo(ListItemComponent) as typeof ListItemComponent;

// Prefetch component for route preloading
export function Prefetch({
    when,
    component
}: {
    when: boolean;
    component: () => Promise<any>;
}) {
    useEffect(() => {
        if (when) {
            component();
        }
    }, [when, component]);

    return null;
}

// Optimized re-render detector (dev only)
export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
    const previousProps = useRef<Record<string, any> | undefined>(undefined);

    useEffect(() => {
        if (previousProps.current) {
            const allKeys = Object.keys({ ...previousProps.current, ...props });
            const changesObj: Record<string, { from: any; to: any }> = {};

            allKeys.forEach((key) => {
                if (previousProps.current![key] !== props[key]) {
                    changesObj[key] = {
                        from: previousProps.current![key],
                        to: props[key],
                    };
                }
            });

            if (Object.keys(changesObj).length) {
                console.log('[why-did-you-update]', name, changesObj);
            }
        }

        previousProps.current = props;
    });
}

// Request idle callback wrapper
export function useIdleCallback(callback: () => void, options?: IdleRequestOptions) {
    useEffect(() => {
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(callback, options);
            return () => window.cancelIdleCallback(id);
        } else {
            const id = setTimeout(callback, 1);
            return () => clearTimeout(id);
        }
    }, [callback, options]);
}

// Batch state updates
export function useBatchedState<T extends Record<string, any>>(initialState: T) {
    const [state, setState] = useState(initialState);
    const pendingUpdates = useRef<Partial<T>>({});
    const rafId = useRef<number | undefined>(undefined);

    const batchUpdate = useCallback((updates: Partial<T>) => {
        pendingUpdates.current = { ...pendingUpdates.current, ...updates };

        if (!rafId.current) {
            rafId.current = requestAnimationFrame(() => {
                setState((prev) => ({ ...prev, ...pendingUpdates.current }));
                pendingUpdates.current = {};
                rafId.current = undefined;
            });
        }
    }, []);

    useEffect(() => {
        return () => {
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
            }
        };
    }, []);

    return [state, batchUpdate] as const;
}
