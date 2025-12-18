
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Image as ImageIcon, ExternalLink } from 'lucide-react';

export default function ImageGallery({ tenantId }: { tenantId: number }) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/images?tenant_id=${tenantId}`)
      .then(res => setImages(res.data.images))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <div>Loading assets...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((img, i) => (
          <div key={i} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 group">
            <div className="relative aspect-video bg-gray-900">
              <img src={img.url} alt="Generated asset" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a 
                  href={img.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-white text-black rounded-full hover:bg-gray-200"
                  aria-label="View original image"
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
            No generated images found for this tenant.
          </div>
        )}
      </div>
    </div>
  );
}
