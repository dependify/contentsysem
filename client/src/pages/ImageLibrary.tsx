
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Image as ImageIcon, ExternalLink, Search, Filter, Edit2, Trash2 } from 'lucide-react';
import ImageEditor from '../components/ImageEditor';

export default function ImageLibrary() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = (query = '') => {
    setLoading(true);
    const endpoint = query ? '/images/search' : '/images';
    api.get(endpoint, { params: { query } })
      .then(res => setImages(res.data.images))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImages(searchQuery);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await api.delete(`/images/${id}`);
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSaveEditedImage = async (blob: Blob) => {
    if (!editingImage) return;

    const formData = new FormData();
    formData.append('image', blob, `edited-${editingImage.filename || 'image.png'}`);
    formData.append('tenant_id', (editingImage.tenant_id || 1).toString());
    formData.append('alt_text', `Edited: ${editingImage.alt_text || editingImage.filename || 'Untitled'}`);
    formData.append('image_type', 'edited');

    try {
      const res = await api.post('/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setImages([res.data.image, ...images]);
        setIsEditorOpen(false);
        setEditingImage(null);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save edited image');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Image Asset Library</h2>
        <p className="text-gray-400 mt-2">All generated visual assets across clients</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-800">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by keyword, prompt, or filename..."
            className="w-full bg-gray-800 border-none rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading assets...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((img, i) => (
            <div key={i} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 group">
              <div className="relative aspect-video bg-gray-900">
                <img src={img.url} alt="Generated asset" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button
                    onClick={() => { setEditingImage(img); setIsEditorOpen(true); }}
                    className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 transition-colors"
                    title="Edit Image"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="p-2 bg-red-600 rounded-full text-white hover:bg-red-500 transition-colors"
                    title="Delete Image"
                  >
                    <Trash2 size={20} />
                  </button>
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-colors"
                    title="View Original"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-1">Source: {img.post_title}</p>
                <p className="text-sm line-clamp-2 text-gray-300 italic">"{img.prompt || 'No prompt data'}"</p>
              </div>
            </div>
          ))}
          {images.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
              No generated images found yet.
            </div>
          )}
        </div>
      )}

      {editingImage && (
        <ImageEditor
          isOpen={isEditorOpen}
          imageUrl={editingImage.url}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveEditedImage}
        />
      )}
    </div>
  );
}
