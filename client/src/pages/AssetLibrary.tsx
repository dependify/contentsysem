
import { useState } from 'react';
import api from '../lib/api';
import { Plus, List } from 'lucide-react';

export default function AssetLibrary({ tenantId }: { tenantId: number }) {
  const [titles, setTitles] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBulkAdd = async () => {
    if (!titles.trim()) return;
    setLoading(true);
    try {
      const titleList = titles.split('\n').filter(t => t.trim());
      await api.post('/content/bulk-add', {
        tenant_id: tenantId,
        titles: titleList
      });
      alert(`Added ${titleList.length} titles to queue`);
      setTitles('');
    } catch (error) {
      console.error(error);
      alert('Failed to add titles');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus size={20} className="text-indigo-400" />
          Bulk Add Titles
        </h3>
        <p className="text-sm text-gray-400 mb-4">Paste blog post titles (one per line) to add to the backlog.</p>

        <textarea
          className="w-full bg-gray-900 border border-gray-700 rounded p-3 h-48 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
          placeholder="Top 10 AI Tools&#10;How to scale content&#10;..."
          value={titles}
          onChange={e => setTitles(e.target.value)}
        />

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleBulkAdd}
            disabled={loading || !titles.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Add to Queue'}
          </button>
        </div>
      </div>
    </div>
  );
}
