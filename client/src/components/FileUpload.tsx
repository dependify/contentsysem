
import { useState } from 'react';
import { Upload, X, FileText, CheckCircle } from 'lucide-react';
import api from '../lib/api';

export default function FileUpload({ tenantId, field, label }: { tenantId: number, field: string, label: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('field', field);

    try {
      await api.post(`/tenants/${tenantId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setFile(null);
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-gray-700 rounded p-4 bg-gray-900/50">
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>

      {!file ? (
        <div className="relative border-2 border-dashed border-gray-700 rounded p-6 text-center hover:border-indigo-500 transition-colors">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={e => setFile(e.target.files?.[0] || null)}
            accept=".txt,.md"
          />
          <Upload className="mx-auto text-gray-500 mb-2" size={24} />
          <p className="text-xs text-gray-500">Drag & drop or click to upload .txt/.md</p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText size={16} className="text-indigo-400 flex-shrink-0" />
            <span className="text-sm truncate">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {success ? (
              <CheckCircle size={16} className="text-green-400" />
            ) : (
              <>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded"
                >
                  {uploading ? '...' : 'Upload'}
                </button>
                <button onClick={() => setFile(null)} className="text-gray-500 hover:text-white">
                  <X size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
