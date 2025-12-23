
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, RefreshCw, CheckCircle, XCircle, Clock, Edit2, Send, AlertCircle, Loader2 } from 'lucide-react';
import PostEditor from '../pages/PostEditor';

export default function ContentList({ tenantId }: { tenantId: number }) {
  const [queue, setQueue] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQueue = () => {
    api.get(`/queue/status/${tenantId}`)
      .then(res => setQueue(res.data.queue_status))
      .catch(console.error);
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);
    try {
      await api.post('/content/add', { 
        tenant_id: tenantId, 
        title 
      });
      setTitle('');
      fetchQueue();
    } catch (err) {
      console.error(err);
      alert('Failed to add content');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (id: number) => {
    if (!confirm('Approve and publish to WordPress?')) return;
    try {
      await api.post(`/posts/${id}/publish`);
      fetchQueue();
    } catch (err) {
      alert('Publish failed');
    }
  };

  return (
    <div className="space-y-8">
      {editingPost && (
        <PostEditor 
          postId={editingPost} 
          onClose={() => setEditingPost(null)}
          onSave={() => { setEditingPost(null); fetchQueue(); }}
        />
      )}

      {/* Add Content */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            aria-label="Blog post title"
            placeholder="Enter blog title to generate..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            {isSubmitting ? 'Queueing...' : 'Queue Content'}
          </button>
        </form>
      </div>

      {/* Queue List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Progress</th>
              <th className="px-6 py-3">Scheduled</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {queue.map((item) => (
              <tr key={item.id} className="hover:bg-gray-750">
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${item.status === 'complete' ? 'bg-green-900 text-green-200' : 
                      item.status === 'failed' ? 'bg-red-900 text-red-200' : 
                      item.status === 'review_pending' ? 'bg-yellow-900 text-yellow-200' :
                      item.status === 'processing' ? 'bg-blue-900 text-blue-200' : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {item.status === 'complete' && <CheckCircle size={12} />}
                    {item.status === 'failed' && <XCircle size={12} />}
                    {item.status === 'review_pending' && <AlertCircle size={12} />}
                    {item.status === 'pending' && <Clock size={12} />}
                    {item.status === 'processing' && <RefreshCw size={12} className="animate-spin" />}
                    {item.status.toUpperCase().replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium">{item.title}</td>
                <td className="px-6 py-4">
                  <div className="w-full bg-gray-700 rounded-full h-1.5 max-w-[100px]">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${(item.current_step / 11) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">Step {item.current_step}/11</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {format(new Date(item.scheduled_for), 'MMM d, h:mm a')}
                </td>
                <td className="px-6 py-4 flex items-center gap-3">
                  {(item.status === 'review_pending' || item.status === 'complete' || item.status === 'draft_ready') && (
                    <button 
                      onClick={() => setEditingPost(item.id)}
                      className="text-gray-400 hover:text-white"
                      title="Edit Content"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                  
                  {item.status === 'review_pending' && (
                    <button 
                      onClick={() => handlePublish(item.id)}
                      className="text-green-400 hover:text-green-300"
                      title="Approve & Publish"
                    >
                      <Send size={18} />
                    </button>
                  )}

                  {item.published_url && (
                    <a 
                      href={item.published_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                    >
                      View Post
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Queue is empty. Add a title to start generating content.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
