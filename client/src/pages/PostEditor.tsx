
import { useEffect, useState } from 'react';
import { X, Save, Eye, Code } from 'lucide-react';
import api from '../lib/api';

interface PostEditorProps {
  postId: number;
  onClose: () => void;
  onSave: () => void;
}

export default function PostEditor({ postId, onClose, onSave }: PostEditorProps) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'markdown' | 'html'>('markdown');
  const [content, setContent] = useState('');

  useEffect(() => {
    api.get(`/posts/${postId}`)
      .then(res => {
        setPost(res.data.post);
        // Default to markdown if available, else html
        setContent(res.data.post.markdown_content || res.data.post.html_content || '');
        setMode(res.data.post.markdown_content ? 'markdown' : 'html');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSave = async () => {
    try {
      const payload = mode === 'markdown' 
        ? { markdown_content: content } 
        : { html_content: content };
        
      await api.put(`/posts/${postId}`, payload);
      alert('Post updated');
      onSave();
    } catch (err) {
      alert('Failed to save');
    }
  };

  if (loading) return <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">Loading...</div>;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col border border-gray-700">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold truncate pr-4">{post?.title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('markdown')}
              className={`p-2 rounded ${mode === 'markdown' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Edit Markdown"
            >
              <Code size={18} />
            </button>
            <button
              onClick={() => setMode('html')}
              className={`p-2 rounded ${mode === 'html' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Edit HTML"
            >
              <Eye size={18} />
            </button>
            <div className="w-px h-6 bg-gray-700 mx-2"></div>
            <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded">
              <Save size={18} /> Save
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4 bg-gray-900">
          <textarea
            className="w-full h-full bg-transparent text-gray-300 font-mono text-sm outline-none resize-none"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Enter ${mode} content here...`}
          />
        </div>
        
        <div className="p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-500 text-right">
          Editing: {mode.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
