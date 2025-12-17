
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, Globe, Settings, FileText, Calendar, Edit3 } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import AssetLibrary from './AssetLibrary';
import Schedule from './Schedule';

export default function Tenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [view, setView] = useState<'create' | 'manage'>('create');
  
  const [formData, setFormData] = useState({
    business_name: '',
    domain_url: '',
    brand_voice: 'Professional',
    auto_publish: true
  });

  useEffect(() => {
    // In a real app, fetch list of tenants
    // For now we just show create form default
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/tenants', formData);
      alert('Tenant created!');
      setSelectedTenant(res.data.tenant_id);
      setView('manage');
      setFormData({ business_name: '', domain_url: '', brand_voice: 'Professional', auto_publish: true });
    } catch (err) {
      alert('Failed to create tenant');
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Tenant Management</h2>
          <p className="text-gray-400 mt-2">Create and manage client workspaces</p>
        </div>
        <div className="flex bg-gray-800 rounded p-1">
          <button
            onClick={() => setView('create')}
            className={`px-4 py-2 rounded text-sm ${view === 'create' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Create New
          </button>
          <button
            onClick={() => setView('manage')}
            className={`px-4 py-2 rounded text-sm ${view === 'manage' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Manage Active
          </button>
        </div>
      </div>

      {view === 'create' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus size={20} className="text-indigo-400" />
            Onboard New Client
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.business_name}
                  onChange={e => setFormData({...formData, business_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Domain URL</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-gray-700 bg-gray-900 text-gray-500">
                    <Globe size={16} />
                  </span>
                  <input
                    type="url"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-r p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.domain_url}
                    onChange={e => setFormData({...formData, domain_url: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Brand Voice (Default)</label>
              <textarea
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                value={formData.brand_voice}
                onChange={e => setFormData({...formData, brand_voice: e.target.value})}
                placeholder="e.g. Professional, Witty, Empathetic..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto_publish"
                className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                checked={formData.auto_publish}
                onChange={e => setFormData({...formData, auto_publish: e.target.checked})}
              />
              <label htmlFor="auto_publish" className="text-sm font-medium text-gray-400 select-none">
                Auto-publish to WordPress (Skip manual review)
              </label>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
            >
              Create Tenant Workspace
            </button>
          </form>
        </div>
      )}

      {view === 'manage' && selectedTenant && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Settings size={20} className="text-indigo-400" />
              Client Identity Layer
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUpload tenantId={selectedTenant} field="icp_profile" label="Ideal Customer Profile (ICP)" />
              <FileUpload tenantId={selectedTenant} field="brand_voice" label="Brand Voice Guidelines" />
              <FileUpload tenantId={selectedTenant} field="marketing_frameworks" label="Marketing Frameworks" />
              <FileUpload tenantId={selectedTenant} field="lead_magnets" label="Lead Magnets" />
            </div>
          </div>

          <AssetLibrary tenantId={selectedTenant} />
          
          <div className="mt-8">
            <Schedule tenantId={selectedTenant} />
          </div>
        </div>
      )}

      {view === 'manage' && !selectedTenant && (
        <div className="text-center py-12 bg-gray-800 rounded border border-gray-700">
          <p className="text-gray-400">Select a tenant or create a new one to manage assets.</p>
          <p className="text-xs text-gray-500 mt-2">(In a full app, a list of tenants would appear here)</p>
        </div>
      )}
    </div>
  );
}
