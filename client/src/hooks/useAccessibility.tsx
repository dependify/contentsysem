// Accessibility improvements - hooks and utilities
import { useEffect, useRef, useCallback } from 'react';

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive) return;

        // Store current focus
        previousFocusRef.current = document.activeElement as HTMLElement;

        const container = containerRef.current;
        if (!container) return;

        // Get all focusable elements
        const getFocusableElements = () => {
            return container.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        };

        // Focus first element
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Handle tab key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const elements = getFocusableElements();
            if (elements.length === 0) return;

            const firstElement = elements[0];
            const lastElement = elements[elements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            // Restore focus on cleanup
            previousFocusRef.current?.focus();
        };
    }, [isActive]);

    return containerRef;
}

// Keyboard navigation for lists
export function useKeyboardNavigation<T>(
    items: T[],
    onSelect: (item: T) => void,
    options: { loop?: boolean; orientation?: 'horizontal' | 'vertical' } = {}
) {
    const { loop = true, orientation = 'vertical' } = options;
    const indexRef = useRef(0);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const prevKeys = orientation === 'vertical' ? ['ArrowUp'] : ['ArrowLeft'];
        const nextKeys = orientation === 'vertical' ? ['ArrowDown'] : ['ArrowRight'];

        if ([...prevKeys, ...nextKeys, 'Enter', ' ', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
        }

        if (prevKeys.includes(e.key)) {
            indexRef.current = loop
                ? (indexRef.current - 1 + items.length) % items.length
                : Math.max(0, indexRef.current - 1);
        } else if (nextKeys.includes(e.key)) {
            indexRef.current = loop
                ? (indexRef.current + 1) % items.length
                : Math.min(items.length - 1, indexRef.current + 1);
        } else if (e.key === 'Home') {
            indexRef.current = 0;
        } else if (e.key === 'End') {
            indexRef.current = items.length - 1;
        } else if (e.key === 'Enter' || e.key === ' ') {
            onSelect(items[indexRef.current]);
        }

        return indexRef.current;
    }, [items, onSelect, loop, orientation]);

    return { handleKeyDown, currentIndex: indexRef.current };
}

// Announce to screen readers
export function useAnnounce() {
    const announceRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Create live region
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
        announceRef.current = liveRegion;

        return () => {
            document.body.removeChild(liveRegion);
        };
    }, []);

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (announceRef.current) {
            announceRef.current.setAttribute('aria-live', priority);
            announceRef.current.textContent = message;

            // Clear after announcement
            setTimeout(() => {
                if (announceRef.current) {
                    announceRef.current.textContent = '';
                }
            }, 1000);
        }
    }, []);

    return announce;
}

// Skip link component
export function SkipLink({ targetId, children = 'Skip to main content' }: { targetId: string; children?: string }) {
    return (
        <a
            href={`#${targetId}`}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg"
        >
            {children}
        </a>
    );
}

// Visually hidden but accessible
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
    return (
        <span className="sr-only">
            {children}
        </span>
    );
}

// ARIA live region for dynamic content
export function LiveRegion({
    children,
    mode = 'polite'
}: {
    children: React.ReactNode;
    mode?: 'polite' | 'assertive'
}) {
    return (
        <div role="status" aria-live={mode} aria-atomic="true">
            {children}
        </div>
    );
}

// Accessible icon button
interface AccessibleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    label: string;
}

export function AccessibleIconButton({ icon, label, ...props }: AccessibleIconButtonProps) {
    return (
        <button
            {...props}
            aria-label={label}
            title={label}
        >
            {icon}
            <VisuallyHidden>{label}</VisuallyHidden>
        </button>
    );
}

// Accessible tabs
interface Tab {
    id: string;
    label: string;
    content: React.ReactNode;
}

export function AccessibleTabs({
    tabs,
    activeId,
    onChange
}: {
    tabs: Tab[];
    activeId: string;
    onChange: (id: string) => void;
}) {
    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        let newIndex = index;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            newIndex = (index + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            newIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
            e.preventDefault();
            newIndex = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            newIndex = tabs.length - 1;
        }

        if (newIndex !== index) {
            onChange(tabs[newIndex].id);
        }
    };

    return (
        <div>
            <div role="tablist" className="flex border-b border-gray-700">
                {tabs.map((tab, index) => (
                    <button
                        key={tab.id}
                        role="tab"
                        id={`tab-${tab.id}`}
                        aria-selected={activeId === tab.id}
                        aria-controls={`tabpanel-${tab.id}`}
                        tabIndex={activeId === tab.id ? 0 : -1}
                        onClick={() => onChange(tab.id)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeId === tab.id
                                ? 'text-indigo-400 border-b-2 border-indigo-400'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    role="tabpanel"
                    id={`tabpanel-${tab.id}`}
                    aria-labelledby={`tab-${tab.id}`}
                    hidden={activeId !== tab.id}
                    tabIndex={0}
                >
                    {activeId === tab.id && tab.content}
                </div>
            ))}
        </div>
    );
}

// Reduced motion hook
export function usePrefersReducedMotion() {
    const query = '(prefers-reduced-motion: reduce)';

    const mediaQueryList = typeof window !== 'undefined'
        ? window.matchMedia(query)
        : null;

    return mediaQueryList?.matches ?? false;
}

// High contrast mode detection
export function usePrefersHighContrast() {
    const query = '(prefers-contrast: more)';

    const mediaQueryList = typeof window !== 'undefined'
        ? window.matchMedia(query)
        : null;

    return mediaQueryList?.matches ?? false;
}
