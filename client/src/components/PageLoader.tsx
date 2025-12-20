// Page Loader Component for Suspense Fallback (f94)
// Shown while lazy-loaded route components are loading

import { Loader2 } from 'lucide-react';

export function PageLoader() {
    return (
        <div
            className="flex flex-col items-center justify-center h-64 gap-4"
            role="status"
            aria-label="Loading page"
        >
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" aria-hidden="true" />
            <p className="text-gray-400 text-sm">Loading...</p>
        </div>
    );
}

export default PageLoader;
