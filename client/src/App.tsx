// ContentSys - Main Application Entry Point
// f92: Responsive mobile layout
// f93: Accessibility improvements (ARIA, skip links, landmarks)
// f94: Performance optimizations (React.lazy, Suspense)

import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, LogOut, Image, Terminal,
  GitBranch, Calendar, BarChart3, UserCog, Sun, Moon, Menu, X,
  Activity, Settings, ClipboardList, HelpCircle, Bell, Download, Key,
  Check, AlertCircle, Info, CheckCircle, Clock, Trash2
} from 'lucide-react';

// Lazy load page components (f94 - Performance)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TenantList = lazy(() => import('./pages/TenantList'));
const TenantOnboarding = lazy(() => import('./pages/TenantOnboarding'));
const TenantDetail = lazy(() => import('./pages/TenantDetail'));
const Content = lazy(() => import('./pages/Content'));
const ImageLibrary = lazy(() => import('./pages/ImageLibrary'));
const Prompts = lazy(() => import('./pages/Prompts'));
const Workflows = lazy(() => import('./pages/Workflows'));
const ContentCalendar = lazy(() => import('./pages/Calendar'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Profile = lazy(() => import('./pages/Profile'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));

// Direct imports for auth pages (small, needed immediately)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './components/ui';
import GlobalSearch from './components/GlobalSearch';
import SkipLink from './components/SkipLink';
import PageLoader from './components/PageLoader';
import HelpSection from './components/HelpSection';
import OnboardingTour from './components/OnboardingTour';
import { clsx } from 'clsx';

// f93: Added aria-current for accessibility
function NavItem({ to, icon: Icon, children, onClick }: { to: string, icon: any, children: React.ReactNode, onClick?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        "flex items-center space-x-2 px-4 py-2 rounded-md transition-colors",
        isActive ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
      )}
    >
      <Icon size={20} aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

function TenantSelector() {
  const { tenants, currentTenant, setCurrentTenant, loading } = useTenant();

  if (loading || tenants.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-gray-800 tenant-selector">
      <label className="text-xs text-gray-500 block mb-1">Active Tenant</label>
      <select
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200"
        value={currentTenant?.id || ''}
        onChange={(e) => {
          const tenant = tenants.find(t => t.id === parseInt(e.target.value));
          setCurrentTenant(tenant || null);
        }}
      >
        {tenants.map(t => (
          <option key={t.id} value={t.id}>{t.business_name}</option>
        ))}
      </select>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

// Inline Notification Panel for modal use
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'success', title: 'Content Published', message: 'Your article was published successfully.', read: false, created_at: new Date().toISOString() },
    { id: 2, type: 'info', title: 'New User Registered', message: 'John Doe has registered and is pending approval.', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 3, type: 'warning', title: 'Low API Credits', message: 'Your API credits are running low. Please top up.', read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
  ]);

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      default: return Info;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {notifications.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Bell size={32} className="mx-auto mb-2 opacity-50" />
          No notifications
        </div>
      ) : (
        notifications.map((notification) => {
          const Icon = getIcon(notification.type);
          return (
            <div key={notification.id} className={`p-4 border-b border-gray-700 hover:bg-gray-700/50 ${!notification.read ? 'bg-indigo-600/10' : ''}`}>
              <div className="flex gap-3">
                <Icon size={20} className={getIconColor(notification.type)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`font-medium truncate ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button onClick={() => markAsRead(notification.id)} className="p-1 text-gray-500 hover:text-white" title="Mark as read">
                          <Check size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteNotification(notification.id)} className="p-1 text-gray-500 hover:text-red-400" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock size={12} />
                    {formatTime(notification.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // f92: Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Feature modals
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if onboarding needed
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    const onboardingSkipped = localStorage.getItem('onboarding_skipped');
    if (!onboardingCompleted && !onboardingSkipped && user) {
      setTimeout(() => setShowOnboarding(true), 1000);
    }
  }, [user]);

  // f92: Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // f92: Close mobile menu when window is resized above md breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* f93: Skip Link for accessibility */}
      <SkipLink />

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Help Modal */}
      <HelpSection isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Notifications Modal */}
      {notificationsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4" onClick={() => setNotificationsOpen(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl mt-14 mr-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="font-semibold">Notifications</h3>
              <button onClick={() => setNotificationsOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <NotificationPanel onClose={() => setNotificationsOpen(false)} />
          </div>
        </div>
      )}

      {/* f92: Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - f92: Responsive with mobile slide-in */}
      <aside
        className={clsx(
          "bg-gray-950 border-r border-gray-800 flex flex-col z-40 transition-transform duration-300",
          "md:relative md:translate-x-0 md:w-64",
          "fixed inset-y-0 left-0 w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header with close button on mobile */}
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">ContentSys</h1>
            <p className="text-xs text-gray-500 mt-1">Multi-Tenant AI Engine</p>
          </div>
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Tenant Selector */}
        <TenantSelector />

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto py-4" aria-label="Sidebar">
          {user.role === 'admin' && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin God Mode
              </div>
              <NavItem to="/" icon={LayoutDashboard} onClick={closeMobileMenu}>System Status</NavItem>
              <NavItem to="/tenants" icon={Users} onClick={closeMobileMenu}>Tenant Management</NavItem>
              <NavItem to="/users" icon={UserCog} onClick={closeMobileMenu}>User Management</NavItem>
              <NavItem to="/prompts" icon={Terminal} onClick={closeMobileMenu}>Prompts</NavItem>
              <NavItem to="/workflows" icon={GitBranch} onClick={closeMobileMenu}>Workflows</NavItem>
              <NavItem to="/system-health" icon={Activity} onClick={closeMobileMenu}>System Health</NavItem>
              <NavItem to="/settings" icon={Settings} onClick={closeMobileMenu}>System Settings</NavItem>
              <NavItem to="/audit-log" icon={ClipboardList} onClick={closeMobileMenu}>Audit Log</NavItem>
            </>
          )}

          <div className="mt-8 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Content Workspace
          </div>
          <NavItem to="/content" icon={FileText} onClick={closeMobileMenu}>Content Queue</NavItem>
          <NavItem to="/calendar" icon={Calendar} onClick={closeMobileMenu}>Calendar</NavItem>
          <NavItem to="/images" icon={Image} onClick={closeMobileMenu}>Image Library</NavItem>
          <NavItem to="/analytics" icon={BarChart3} onClick={closeMobileMenu}>Analytics</NavItem>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <Link to="/profile" className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-400" aria-hidden="true"></div>
              <span className="truncate max-w-[100px]">{user.email}</span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Logout"
              >
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          {user.role === 'admin' && (
            <span className="text-xs text-indigo-400 block">Administrator</span>
          )}
        </div>
      </aside>

      {/* Main Content - f92: Responsive */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header
          className="h-14 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900/50"
          role="banner"
        >
          {/* f92: Mobile hamburger menu */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg mr-2"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <GlobalSearch />

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg relative"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Help */}
            <button
              onClick={() => setHelpOpen(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              title="Help & Documentation"
            >
              <HelpCircle size={18} />
            </button>

            <span className="hidden sm:block text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* f93: Main content landmark, f94: Suspense for lazy loading */}
        <main
          id="main-content"
          className="flex-1 overflow-auto p-4 md:p-8"
          role="main"
          tabIndex={-1}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tenants" element={<TenantList />} />
              <Route path="/tenants/new" element={<TenantOnboarding />} />
              <Route path="/tenants/:id" element={<TenantDetail />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/content" element={<Content />} />
              <Route path="/calendar" element={<ContentCalendar />} />
              <Route path="/images" element={<ImageLibrary />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/prompts" element={<Prompts />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/system-health" element={<SystemHealth />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/settings" element={<SystemSettings />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <TenantProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/*" element={<Layout />} />
              </Routes>
            </Router>
          </TenantProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
