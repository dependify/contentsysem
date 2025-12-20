// Breadcrumb Navigation Component
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    path: string;
}

// Route to breadcrumb label mapping
const ROUTE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    content: 'Content Queue',
    calendar: 'Calendar',
    images: 'Image Library',
    tenants: 'Tenants',
    analytics: 'Analytics',
    workflows: 'Workflows',
    users: 'Users',
    audit: 'Audit Log',
    settings: 'Settings',
    prompts: 'Prompts',
    health: 'System Health',
    profile: 'Profile',
    new: 'New',
    edit: 'Edit',
};

interface BreadcrumbsProps {
    pageTitle?: string;
    customItems?: BreadcrumbItem[];
}

export default function Breadcrumbs({ pageTitle, customItems }: BreadcrumbsProps) {
    const location = useLocation();

    // Generate breadcrumb items from URL path
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        if (customItems) return customItems;

        const pathSegments = location.pathname.split('/').filter(Boolean);
        const items: BreadcrumbItem[] = [];
        let currentPath = '';

        pathSegments.forEach((segment, index) => {
            currentPath += `/${segment}`;

            // Skip numeric IDs in breadcrumb labels but include in path
            const isId = /^\d+$/.test(segment);

            if (!isId) {
                items.push({
                    label: ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
                    path: currentPath
                });
            }
        });

        return items;
    };

    const breadcrumbs = generateBreadcrumbs();

    if (breadcrumbs.length <= 1 && !pageTitle) {
        return null; // Don't show for root pages without title
    }

    return (
        <div className="mb-6">
            {/* Breadcrumb Trail */}
            <nav className="flex items-center gap-2 text-sm text-gray-400">
                <Link
                    to="/dashboard"
                    className="flex items-center gap-1 hover:text-white transition-colors"
                >
                    <Home size={14} />
                </Link>

                {breadcrumbs.map((item, index) => (
                    <div key={item.path} className="flex items-center gap-2">
                        <ChevronRight size={14} className="text-gray-600" />
                        {index === breadcrumbs.length - 1 ? (
                            <span className="text-gray-300">{item.label}</span>
                        ) : (
                            <Link
                                to={item.path}
                                className="hover:text-white transition-colors"
                            >
                                {item.label}
                            </Link>
                        )}
                    </div>
                ))}
            </nav>

            {/* Page Title */}
            {pageTitle && (
                <h1 className="text-2xl font-bold text-white mt-2">
                    {pageTitle}
                </h1>
            )}
        </div>
    );
}

// Hook to set page title
export function usePageTitle(title: string) {
    // Update document title
    document.title = `${title} | ContentSys`;
}
