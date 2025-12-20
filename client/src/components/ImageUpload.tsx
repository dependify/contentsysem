// Image Upload component with drag-and-drop
import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Button, Modal, ProgressBar, Input } from './ui';
import { useTenant } from '../context/TenantContext';
import api from '../lib/api';

interface UploadedImage {
    id: number;
    url: string;
    filename: string;
    size: number;
}

interface ImageUploadProps {
    onUploadComplete?: (images: UploadedImage[]) => void;
    multiple?: boolean;
}

interface FileUpload {
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'complete' | 'error';
    progress: number;
    error?: string;
    result?: UploadedImage;
}

export default function ImageUpload({ onUploadComplete, multiple = true }: ImageUploadProps) {
    const { currentTenant } = useTenant();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [files, setFiles] = useState<FileUpload[]>([]);
    const [uploading, setUploading] = useState(false);
    const [altText, setAltText] = useState('');

    const handleFileSelect = (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        const newFiles: FileUpload[] = Array.from(selectedFiles)
            .filter(file => file.type.startsWith('image/'))
            .map(file => ({
                file,
                preview: URL.createObjectURL(file),
                status: 'pending' as const,
                progress: 0,
            }));

        if (multiple) {
            setFiles(prev => [...prev, ...newFiles]);
        } else {
            setFiles(newFiles.slice(0, 1));
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files);
    }, []);

    const removeFile = (index: number) => {
        setFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview);
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const uploadFiles = async () => {
        if (!currentTenant || files.length === 0) return;

        setUploading(true);
        const uploadedImages: UploadedImage[] = [];

        for (let i = 0; i < files.length; i++) {
            if (files[i].status === 'complete') continue;

            setFiles(prev => {
                const newFiles = [...prev];
                newFiles[i] = { ...newFiles[i], status: 'uploading', progress: 0 };
                return newFiles;
            });

            try {
                const formData = new FormData();
                formData.append('image', files[i].file);
                formData.append('tenant_id', currentTenant.id.toString());
                if (altText) {
                    formData.append('alt_text', altText);
                }

                const response = await api.post('/images/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const progress = progressEvent.total
                            ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
                            : 0;
                        setFiles(prev => {
                            const newFiles = [...prev];
                            newFiles[i] = { ...newFiles[i], progress };
                            return newFiles;
                        });
                    },
                });

                if (response.data.success) {
                    const uploadedImage = response.data.image;
                    uploadedImages.push(uploadedImage);

                    setFiles(prev => {
                        const newFiles = [...prev];
                        newFiles[i] = {
                            ...newFiles[i],
                            status: 'complete',
                            progress: 100,
                            result: uploadedImage
                        };
                        return newFiles;
                    });
                }
            } catch (error: any) {
                setFiles(prev => {
                    const newFiles = [...prev];
                    newFiles[i] = {
                        ...newFiles[i],
                        status: 'error',
                        error: error.response?.data?.error || 'Upload failed'
                    };
                    return newFiles;
                });
            }
        }

        setUploading(false);

        if (uploadedImages.length > 0) {
            onUploadComplete?.(uploadedImages);
        }
    };

    const closeAndReset = () => {
        files.forEach(f => URL.revokeObjectURL(f.preview));
        setFiles([]);
        setAltText('');
        setIsOpen(false);
    };

    const completedCount = files.filter(f => f.status === 'complete').length;
    const failedCount = files.filter(f => f.status === 'error').length;

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Upload size={16} /> Upload Images
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={closeAndReset}
                title="Upload Images"
                size="lg"
            >
                <div className="space-y-4">
                    {/* Drop Zone */}
                    <div
                        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-300 mb-2">
                            Drag and drop images here, or click to browse
                        </p>
                        <p className="text-gray-500 text-sm">
                            Supports: JPG, PNG, GIF, WebP (max 10MB)
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple={multiple}
                            onChange={(e) => handleFileSelect(e.target.files)}
                            className="hidden"
                        />
                    </div>

                    {/* Alt Text */}
                    <Input
                        label="Alt Text (optional)"
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                        placeholder="Describe these images for accessibility"
                    />

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg"
                                >
                                    <img
                                        src={file.preview}
                                        alt=""
                                        className="w-12 h-12 object-cover rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{file.file.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(file.file.size / 1024).toFixed(1)} KB
                                        </p>
                                        {file.status === 'uploading' && (
                                            <ProgressBar value={file.progress} className="mt-1" />
                                        )}
                                        {file.error && (
                                            <p className="text-xs text-red-400 mt-1">{file.error}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {file.status === 'complete' && (
                                            <Check className="text-green-400" size={18} />
                                        )}
                                        {file.status === 'error' && (
                                            <AlertCircle className="text-red-400" size={18} />
                                        )}
                                        {file.status === 'uploading' && (
                                            <Loader2 className="text-indigo-400 animate-spin" size={18} />
                                        )}
                                        {file.status === 'pending' && (
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="text-gray-500 hover:text-red-400"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <div className="text-sm text-gray-400">
                            {files.length > 0 && (
                                <>
                                    {completedCount} uploaded
                                    {failedCount > 0 && <>, {failedCount} failed</>}
                                </>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={closeAndReset}>
                                {completedCount > 0 ? 'Done' : 'Cancel'}
                            </Button>
                            {files.some(f => f.status === 'pending') && (
                                <Button onClick={uploadFiles} loading={uploading}>
                                    Upload {files.filter(f => f.status === 'pending').length} Files
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
