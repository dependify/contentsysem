// Responsive Sidebar Navigation with Tenant Switcher
import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FileText, Calendar, Image, Settings,
    Users, Shield, BarChart3, Activity, ChevronLeft, ChevronRight,
    Building, FolderOpen, Sparkles, Menu, X
} from 'lucide-react';
import TenantSwitcher from './TenantSwitcher';

interface NavItem {
    path: string;
    label: string;
    icon: any;
    badge?: number;
    adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/content', label: 'Content Queue', icon: FileText },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/images', label: 'Image Library', icon: Image },
    { path: '/tenants', label: 'Tenants', icon: Building },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/workflows', label: 'Workflows', icon: Sparkles },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
    { path: '/users', label: 'Users', icon: Users, adminOnly: true },
    { path: '/audit', label: 'Audit Log', icon: Activity, adminOnly: true },
    { path: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
    { path: '/prompts', label: 'Prompts', icon: FolderOpen, adminOnly: true },
    { path: '/health', label: 'System Health', icon: Shield, adminOnly: true },
];

interface SidebarProps {
    isAdmin?: boolean;
}

export default function Sidebar({ isAdmin = false }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const location = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const NavItemComponent = ({ item }: { item: NavItem }) => (
        <NavLink
            to={item.path}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                } ${isCollapsed ? 'justify-center' : ''}`
            }
        >
            <item.icon size={20} />
            {!isCollapsed && (
                <span className="flex-1">{item.label}</span>
            )}
            {!isCollapsed && item.badge && (
                <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {item.badge}
                </span>
            )}
        </NavLink>
    );

    const sidebarContent = (
        <>
            {/* Header */}
            <div className={`p-4 border-b border-gray-700 ${isCollapsed ? 'px-2' : ''}`}>
                {!isCollapsed ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Sparkles size={18} />
                            </div>
                            <span className="font-bold text-lg">ContentSys</span>
                        </div>
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className="p-1 text-gray-400 hover:text-white rounded lg:block hidden"
                            aria-label="Collapse sidebar"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="w-full flex justify-center p-2 text-gray-400 hover:text-white rounded"
                        aria-label="Expand sidebar"
                    >
                        <ChevronRight size={18} />
                    </button>
                )}
            </div>

            {/* Tenant Switcher */}
            {!isCollapsed && (
                <div className="p-3 border-b border-gray-700">
                    <TenantSwitcher />
                </div>
            )}

            {/* Main Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                    <NavItemComponent key={item.path} item={item} />
                ))}

                {/* Admin Section */}
                {isAdmin && (
                    <>
                        {!isCollapsed && (
                            <div className="pt-4 pb-2 px-3 text-xs text-gray-500 uppercase tracking-wide">
                                Administration
                            </div>
                        )}
                        {ADMIN_NAV_ITEMS.map((item) => (
                            <NavItemComponent key={item.path} item={item} />
                        ))}
                    </>
                )}
            </nav>

            {/* Footer */}
            {!isCollapsed && (
                <div className="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
                    ContentSys v1.0
                </div>
            )}
        </>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-gray-800 rounded-lg border border-gray-700"
                aria-label="Open mobile menu"
            >
                <Menu size={20} />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-700 transform transition-transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white"
                    aria-label="Close mobile menu"
                >
                    <X size={20} />
                </button>
                {sidebarContent}
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:flex flex-col h-screen bg-gray-900 border-r border-gray-700 transition-all ${isCollapsed ? 'w-16' : 'w-64'
                    }`}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
