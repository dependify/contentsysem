
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  Plus, RefreshCw, CheckCircle, XCircle, Clock, Edit2, Send, AlertCircle,
  Trash2, RotateCcw, Pause, Play, MoreVertical, Calendar as CalendarIcon,
  Ban
} from 'lucide-react';
import PostEditor from './PostEditor';
import { useTenant } from '../context/TenantContext';

export default function Content() {
  const { currentTenant } = useTenant();
  const [queue, setQueue] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const tenantId = currentTenant?.id || 1;
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ id: number, currentDate: string } | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchQueue = () => {
    api.get(`/queue/status/${tenantId}`)
      .then(res => setQueue(res.data.queue_status || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [tenantId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      await api.post('/content/add', { tenant_id: tenantId, title });
      setTitle('');
      fetchQueue();
    } catch (err) {
      console.error(err);
      alert('Failed to add content');
    }
  };

  const handlePublish = async (id: number) => {
    if (!confirm('Approve and publish to WordPress?')) return;
    try {
      setActionLoading(id);
      await api.post(`/posts/${id}/publish`);
      fetchQueue();
    } catch (err) {
      alert('Publish failed');
    } finally {
      setActionLoading(null);
    }
  };

  // CRUD Actions
  const handleRetry = async (id: number) => {
    try {
      setActionLoading(id);
      await api.post(`/content/queue/${id}/retry`);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Retry failed');
    } finally {
      setActionLoading(null);
      setOpenDropdown(null);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      setActionLoading(id);
      await api.post(`/content/queue/${id}/cancel`);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancel failed');
    } finally {
      setActionLoading(null);
      setOpenDropdown(null);
    }
  };

  const handlePause = async (id: number) => {
    try {
      setActionLoading(id);
      await api.post(`/content/queue/${id}/pause`);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Pause failed');
    } finally {
      setActionLoading(null);
      setOpenDropdown(null);
    }
  };

  const handleResume = async (id: number) => {
    try {
      setActionLoading(id);
      await api.post(`/content/queue/${id}/resume`);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Resume failed');
    } finally {
      setActionLoading(null);
      setOpenDropdown(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setActionLoading(id);
      await api.delete(`/content/queue/${id}`);
      setDeleteConfirm(null);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleModal || !newScheduleDate) return;
    try {
      setActionLoading(rescheduleModal.id);
      await api.put(`/calendar/reschedule/${rescheduleModal.id}`, {
        scheduled_for: new Date(newScheduleDate).toISOString()
      });
      setRescheduleModal(null);
      setNewScheduleDate('');
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Reschedule failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      complete: 'bg-green-900 text-green-200',
      failed: 'bg-red-900 text-red-200',
      review_pending: 'bg-yellow-900 text-yellow-200',
      processing: 'bg-blue-900 text-blue-200',
      pending: 'bg-gray-700 text-gray-200',
      paused: 'bg-orange-900 text-orange-200',
      cancelled: 'bg-gray-600 text-gray-300',
      draft_ready: 'bg-purple-900 text-purple-200',
    };
    const icons: Record<string, JSX.Element> = {
      complete: <CheckCircle size={12} />,
      failed: <XCircle size={12} />,
      review_pending: <AlertCircle size={12} />,
      pending: <Clock size={12} />,
      processing: <RefreshCw size={12} className="animate-spin" />,
      paused: <Pause size={12} />,
      cancelled: <Ban size={12} />,
      draft_ready: <Edit2 size={12} />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {icons[status] || <Clock size={12} />}
        {status.toUpperCase().replace('_', ' ')}
      </span>
    );
  };

  const getAvailableActions = (item: any) => {
    const actions: { label: string; icon: any; onClick: () => void; danger?: boolean }[] = [];

    if (item.status === 'failed') {
      actions.push({ label: 'Retry', icon: RotateCcw, onClick: () => handleRetry(item.id) });
    }
    if (item.status === 'pending') {
      actions.push({ label: 'Cancel', icon: Ban, onClick: () => handleCancel(item.id) });
    }
    if (item.status === 'processing' || item.status === 'pending') {
      actions.push({ label: 'Pause', icon: Pause, onClick: () => handlePause(item.id) });
    }
    if (item.status === 'paused') {
      actions.push({ label: 'Resume', icon: Play, onClick: () => handleResume(item.id) });
    }
    if (item.status !== 'processing') {
      actions.push({
        label: 'Reschedule',
        icon: CalendarIcon,
        onClick: () => {
          setRescheduleModal({ id: item.id, currentDate: item.scheduled_for });
          setNewScheduleDate(item.scheduled_for?.slice(0, 16) || '');
          setOpenDropdown(null);
        }
      });
    }
    if (item.status !== 'processing') {
      actions.push({
        label: 'Delete',
        icon: Trash2,
        onClick: () => { setDeleteConfirm(item.id); setOpenDropdown(null); },
        danger: true
      });
    }
    return actions;
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Content Item?</h3>
            <p className="text-gray-400 mb-6">
              This will permanently delete this content item and all associated artifacts. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading === deleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-2"
              >
                {actionLoading === deleteConfirm && <RefreshCw size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Reschedule Content</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">New Schedule Date & Time</label>
              <input
                type="datetime-local"
                value={newScheduleDate}
                onChange={(e) => setNewScheduleDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setRescheduleModal(null); setNewScheduleDate(''); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={actionLoading === rescheduleModal.id || !newScheduleDate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors flex items-center gap-2"
              >
                {actionLoading === rescheduleModal.id && <RefreshCw size={14} className="animate-spin" />}
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Content Assembly Line</h2>
          <p className="text-gray-400 mt-2">Manage generation queue for {currentTenant?.business_name || `Tenant #${tenantId}`}</p>
        </div>
        <button
          onClick={fetchQueue}
          className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Add Content */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            placeholder="Enter blog title to generate..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded font-medium flex items-center gap-2"
          >
            <Plus size={20} />
            Queue Content
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
            {queue.map((item) => {
              const actions = getAvailableActions(item);
              return (
                <tr key={item.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
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
                    {item.scheduled_for && format(new Date(item.scheduled_for), 'MMM d, h:mm a')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Quick actions */}
                      {(item.status === 'review_pending' || item.status === 'complete' || item.status === 'draft_ready') && (
                        <button
                          onClick={() => setEditingPost(item.id)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Edit Content"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}

                      {item.status === 'review_pending' && (
                        <button
                          onClick={() => handlePublish(item.id)}
                          disabled={actionLoading === item.id}
                          className="p-1.5 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors"
                          title="Approve & Publish"
                        >
                          {actionLoading === item.id ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      )}

                      {item.published_url && (
                        <a
                          href={item.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                        >
                          View
                        </a>
                      )}

                      {/* Actions dropdown */}
                      {actions.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === item.id ? null : item.id); }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openDropdown === item.id && (
                            <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[140px]">
                              {actions.map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-800 transition-colors ${action.danger ? 'text-red-400 hover:text-red-300' : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                  <action.icon size={14} />
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
