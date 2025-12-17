
import { useState } from 'react';
import api from '../lib/api';
import { Plus, Globe } from 'lucide-react';

export default function Tenants() {
  const [formData, setFormData] = useState({
    business_name: '',
    domain_url: '',
    brand_voice: 'Professional'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tenants', formData);
      alert('Tenant created!');
      setFormData({ business_name: '', domain_url: '', brand_voice: 'Professional' });
    } catch (err) {
      alert('Failed to create tenant');
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Tenant Management</h2>
        <p className="text-gray-400 mt-2">Create and manage client workspaces</p>
      </div>

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
            <label className="block text-sm font-medium text-gray-400 mb-1">Brand Voice</label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
              value={formData.brand_voice}
              onChange={e => setFormData({...formData, brand_voice: e.target.value})}
              placeholder="e.g. Professional, Witty, Empathetic..."
            />
          </div>

          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
          >
            Create Tenant Workspace
          </button>
        </form>
      </div>
    </div>
  );
}
