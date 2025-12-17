
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, LogOut, Image, Terminal, GitBranch } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Content from './pages/Content';
import ImageLibrary from './pages/ImageLibrary';
import Prompts from './pages/Prompts';
import Workflows from './pages/Workflows';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { clsx } from 'clsx';

function NavItem({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
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
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ContentSys
          </h1>
          <p className="text-xs text-gray-500 mt-1">Multi-Tenant AI Engine</p>
        </div>
        
        <nav className="flex-1 px-2 space-y-1">
          {user.role === 'admin' && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin God Mode
              </div>
              <NavItem to="/" icon={LayoutDashboard}>System Status</NavItem>
              <NavItem to="/tenants" icon={Users}>Tenant Management</NavItem>
              <NavItem to="/prompts" icon={Terminal}>Prompts</NavItem>
              <NavItem to="/workflows" icon={GitBranch}>Workflows</NavItem>
            </>
          )}
          
          <div className="mt-8 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Client Workspace
          </div>
          <NavItem to="/content" icon={FileText}>Content Queue</NavItem>
          <NavItem to="/images" icon={Image}>Image Library</NavItem>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="truncate w-24">{user.email}</span>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-white">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/content" element={<Content />} />
            <Route path="/images" element={<ImageLibrary />} />
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
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
