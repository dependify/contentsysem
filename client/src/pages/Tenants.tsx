
import { useState } from 'react';
import api from '../lib/api';
import { Plus, Globe, Settings, Image as ImageIcon, FileText, Calendar } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import AssetLibrary from './AssetLibrary';
import Schedule from './Schedule';
import ImageGallery from '../components/ImageGallery';
import ContentList from '../components/ContentList';

export default function Tenants() {
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [view, setView] = useState<'create' | 'manage'>('manage'); // Default to manage for easier access
  const [activeTab, setActiveTab] = useState<'identity' | 'planning' | 'assets' | 'content'>('identity');

  const [formData, setFormData] = useState({
    business_name: '',
    domain_url: '',
    brand_voice: 'Professional',
    auto_publish: true
  });

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

      {view === 'manage' && !selectedTenant && (
        <div className="text-center py-12 bg-gray-800 rounded border border-gray-700">
          <div className="max-w-md mx-auto">
            <Globe size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Workspace</h3>
            <p className="text-gray-400 mb-6">Enter the Tenant ID to manage their assets and content.</p>
            <div className="flex gap-2 justify-center">
              <input
                type="number"
                placeholder="Tenant ID (e.g. 1)"
                className="bg-gray-900 border border-gray-700 rounded p-2 w-32 text-center"
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > 0) setSelectedTenant(val);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {view === 'manage' && selectedTenant && (
        <div className="space-y-6">
          <div className="bg-gray-800 border-b border-gray-700 px-6 pt-4">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold">Tenant #{selectedTenant}</h2>
              <span className="bg-green-900 text-green-200 text-xs px-2 py-1 rounded">Active</span>
              <button onClick={() => setSelectedTenant(null)} className="text-sm text-gray-400 hover:text-white ml-auto">Switch Tenant</button>
            </div>

            <div className="flex gap-6">
              {[
                { id: 'identity', label: 'Identity & Strategy', icon: Settings },
                { id: 'planning', label: 'Planning & Schedule', icon: Calendar },
                { id: 'content', label: 'Content Queue', icon: FileText },
                { id: 'assets', label: 'Image Gallery', icon: ImageIcon },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'identity' && (
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
          )}

          {activeTab === 'planning' && (
            <div className="space-y-8">
              <AssetLibrary tenantId={selectedTenant} />
              <Schedule tenantId={selectedTenant} />
            </div>
          )}

          {activeTab === 'assets' && (
            <ImageGallery tenantId={selectedTenant} />
          )}

          {activeTab === 'content' && (
            <ContentList tenantId={selectedTenant} />
          )}
        </div>
      )}
    </div>
  );
}
