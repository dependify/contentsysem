// ContentSys - Main Application Entry Point
// f92: Responsive mobile layout
// f93: Accessibility improvements (ARIA, skip links, landmarks)
// f94: Performance optimizations (React.lazy, Suspense)

import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, LogOut, Image, Terminal,
  GitBranch, Calendar, BarChart3, UserCog, Sun, Moon, Menu, X
} from 'lucide-react';

// Lazy load page components (f94 - Performance)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tenants = lazy(() => import('./pages/Tenants'));
const TenantDetail = lazy(() => import('./pages/TenantDetail'));
const Content = lazy(() => import('./pages/Content'));
const ImageLibrary = lazy(() => import('./pages/ImageLibrary'));
const Prompts = lazy(() => import('./pages/Prompts'));
const Workflows = lazy(() => import('./pages/Workflows'));
const ContentCalendar = lazy(() => import('./pages/Calendar'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Analytics = lazy(() => import('./pages/Analytics'));

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
    <div className="px-4 py-3 border-b border-gray-800">
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

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // f92: Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          // Desktop: always visible, fixed width
          "md:relative md:translate-x-0 md:w-64",
          // Mobile: slide from left
          "fixed inset-y-0 left-0 w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header with close button on mobile */}
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">
              ContentSys
            </h1>
            <p className="text-xs text-gray-500 mt-1">Multi-Tenant AI Engine</p>
          </div>
          {/* f92: Close button for mobile */}
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
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400" aria-hidden="true"></div>
              <span className="truncate max-w-[100px]">{user.email}</span>
            </div>
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

          <div className="hidden sm:flex items-center gap-4">
            <span className="text-sm text-gray-500">
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
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/tenants/:id" element={<TenantDetail />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/content" element={<Content />} />
              <Route path="/calendar" element={<ContentCalendar />} />
              <Route path="/images" element={<ImageLibrary />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/prompts" element={<Prompts />} />
              <Route path="/workflows" element={<Workflows />} />
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
