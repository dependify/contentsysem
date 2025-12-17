
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Activity } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Content from './pages/Content';
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

function App() {
  return (
    <Router>
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
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Admin God Mode
            </div>
            <NavItem to="/" icon={LayoutDashboard}>System Status</NavItem>
            <NavItem to="/tenants" icon={Users}>Tenant Management</NavItem>

            <div className="mt-8 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Client Workspace
            </div>
            <NavItem to="/content" icon={FileText}>Content Queue</NavItem>
            {/* <NavItem to="/settings" icon={Settings}>Configuration</NavItem> */}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Activity size={16} className="text-green-400" />
              <span>System Operational</span>
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
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
