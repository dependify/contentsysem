
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Save, RefreshCw, FileText } from 'lucide-react';

export default function Prompts() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchFiles = () => {
    api.get('/admin/prompts')
      .then(res => setFiles(res.data.files))
      .catch(console.error);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const loadFile = async (filename: string) => {
    setLoading(true);
    setSelectedFile(filename);
    try {
      const res = await api.get(`/admin/prompts/${filename}`);
      setContent(res.data.content);
    } catch (err) {
      console.error(err);
      alert('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      await api.post(`/admin/prompts/${selectedFile}`, { content });
      alert('Saved successfully');
    } catch (err) {
      alert('Failed to save');
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      <div className="w-1/4 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 font-semibold flex justify-between">
          <span>Directives</span>
          <button onClick={fetchFiles}><RefreshCw size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {files.map(file => (
            <button
              key={file}
              onClick={() => loadFile(file)}
              className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors ${selectedFile === file ? 'bg-indigo-900/50 text-indigo-300' : 'text-gray-400'}`}
            >
              <FileText size={14} />
              {file}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 flex flex-col overflow-hidden">
        {selectedFile ? (
          <>
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
              <span className="font-mono text-sm">{selectedFile}</span>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
            <div className="flex-1 relative">
              <textarea
                className="absolute inset-0 w-full h-full bg-gray-900 p-4 font-mono text-sm text-gray-300 outline-none resize-none"
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={loading}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a directive to edit
          </div>
        )}
      </div>
    </div>
  );
}
