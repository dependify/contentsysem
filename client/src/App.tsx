// ContentSys - Main Application Entry Point
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, LogOut, Image, Terminal,
  GitBranch, Calendar, BarChart3, UserCog, Sun, Moon
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import TenantDetail from './pages/TenantDetail';
import Content from './pages/Content';
import ImageLibrary from './pages/ImageLibrary';
import Prompts from './pages/Prompts';
import Workflows from './pages/Workflows';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ContentCalendar from './pages/Calendar';
import UserManagement from './pages/UserManagement';
import Analytics from './pages/Analytics';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './components/ui';
import GlobalSearch from './components/GlobalSearch';
import { clsx } from 'clsx';

function NavItem({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      className={clsx(
        "flex items-center space-x-2 px-4 py-2 rounded-md transition-colors",
        isActive ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
      )}
    >
      <Icon size={20} />
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

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold gradient-text">
            ContentSys
          </h1>
          <p className="text-xs text-gray-500 mt-1">Multi-Tenant AI Engine</p>
        </div>

        {/* Tenant Selector */}
        <TenantSelector />

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto py-4">
          {user.role === 'admin' && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin God Mode
              </div>
              <NavItem to="/" icon={LayoutDashboard}>System Status</NavItem>
              <NavItem to="/tenants" icon={Users}>Tenant Management</NavItem>
              <NavItem to="/users" icon={UserCog}>User Management</NavItem>
              <NavItem to="/prompts" icon={Terminal}>Prompts</NavItem>
              <NavItem to="/workflows" icon={GitBranch}>Workflows</NavItem>
            </>
          )}

          <div className="mt-8 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Content Workspace
          </div>
          <NavItem to="/content" icon={FileText}>Content Queue</NavItem>
          <NavItem to="/calendar" icon={Calendar}>Calendar</NavItem>
          <NavItem to="/images" icon={Image}>Image Library</NavItem>
          <NavItem to="/analytics" icon={BarChart3}>Analytics</NavItem>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="truncate max-w-[100px]">{user.email}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
          {user.role === 'admin' && (
            <span className="text-xs text-indigo-400 block">Administrator</span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
          <GlobalSearch />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
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
