// Bulk Content Upload component with CSV/Excel import
import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, Check, Download } from 'lucide-react';
import { Button, Modal, ProgressBar } from '../components/ui';
import { useTenant } from '../context/TenantContext';
import api from '../lib/api';

interface ParsedContent {
    title: string;
    keyword?: string;
    scheduled_date?: string;
    valid: boolean;
    error?: string;
}

interface BulkUploadProps {
    onComplete?: () => void;
}

export default function BulkContentUpload({ onComplete }: BulkUploadProps) {
    const { currentTenant } = useTenant();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedContent[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');

    const parseCSV = (text: string): ParsedContent[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const titleIdx = headers.findIndex(h => h === 'title' || h === 'topic');
        const keywordIdx = headers.findIndex(h => h === 'keyword' || h === 'keywords');
        const dateIdx = headers.findIndex(h => h === 'date' || h === 'scheduled_date' || h === 'schedule');

        if (titleIdx === -1) {
            return [{ title: '', valid: false, error: 'CSV must have a "title" column' }];
        }

        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const title = values[titleIdx] || '';
            const keyword = keywordIdx >= 0 ? values[keywordIdx] : undefined;
            const scheduled_date = dateIdx >= 0 ? values[dateIdx] : undefined;

            if (!title) {
                return { title: '', valid: false, error: 'Missing title' };
            }

            return { title, keyword, scheduled_date, valid: true };
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');
        setParsedData([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            setParsedData(parsed);
        };
        reader.onerror = () => {
            setError('Failed to read file');
        };
        reader.readAsText(selectedFile);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.txt'))) {
            const fakeEvent = { target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileSelect(fakeEvent);
        } else {
            setError('Please upload a CSV file');
        }
    }, []);

    const handleUpload = async () => {
        if (!currentTenant || parsedData.length === 0) return;

        const validItems = parsedData.filter(item => item.valid);
        if (validItems.length === 0) {
            setError('No valid items to upload');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const response = await api.post('/content/bulk', {
                tenant_id: currentTenant.id,
                items: validItems.map(item => ({
                    title: item.title,
                    keyword: item.keyword,
                    scheduled_for: item.scheduled_date,
                })),
            });

            if (response.data.success) {
                setUploadProgress(100);
                setTimeout(() => {
                    setIsOpen(false);
                    onComplete?.();
                    resetState();
                }, 1000);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const resetState = () => {
        setFile(null);
        setParsedData([]);
        setError('');
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const validCount = parsedData.filter(i => i.valid).length;
    const invalidCount = parsedData.filter(i => !i.valid).length;

    const downloadTemplate = () => {
        const template = 'title,keyword,scheduled_date\n"How to Improve SEO",seo tips,2024-01-15\n"Content Marketing Guide",content marketing,2024-01-20';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'content_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <Button variant="secondary" onClick={() => setIsOpen(true)}>
                <Upload size={16} /> Bulk Upload
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => { setIsOpen(false); resetState(); }}
                title="Bulk Content Upload"
                size="lg"
            >
                <div className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {!file ? (
                        <div
                            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <FileSpreadsheet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-300 mb-2">
                                Drag and drop a CSV file here, or click to browse
                            </p>
                            <p className="text-gray-500 text-sm">
                                Supports CSV format with columns: title, keyword (optional), scheduled_date (optional)
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="text-indigo-400" />
                                    <div>
                                        <p className="text-white font-medium">{file.name}</p>
                                        <p className="text-gray-500 text-sm">
                                            {validCount} valid, {invalidCount} invalid
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={resetState}>
                                    <X size={16} />
                                </Button>
                            </div>

                            {parsedData.length > 0 && (
                                <div className="max-h-64 overflow-y-auto">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Status</th>
                                                <th>Title</th>
                                                <th>Keyword</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 20).map((item, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        {item.valid ? (
                                                            <Check className="text-green-400" size={16} />
                                                        ) : (
                                                            <AlertCircle className="text-red-400" size={16} />
                                                        )}
                                                    </td>
                                                    <td className={item.valid ? 'text-gray-300' : 'text-red-400'}>
                                                        {item.title || item.error}
                                                    </td>
                                                    <td className="text-gray-400">{item.keyword || '-'}</td>
                                                    <td className="text-gray-400">{item.scheduled_date || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedData.length > 20 && (
                                        <p className="text-center text-gray-500 text-sm py-2">
                                            + {parsedData.length - 20} more items
                                        </p>
                                    )}
                                </div>
                            )}

                            {uploading && (
                                <ProgressBar value={uploadProgress} showLabel />
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <Button variant="ghost" onClick={downloadTemplate}>
                            <Download size={16} /> Download Template
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => { setIsOpen(false); resetState(); }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!file || validCount === 0}
                                loading={uploading}
                            >
                                Upload {validCount} Items
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
