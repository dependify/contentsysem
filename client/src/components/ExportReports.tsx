// Report Export Component
import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button, Modal } from './ui';
import api from '../lib/api';

interface ExportReportsProps {
    tenantId?: number;
    dateFrom: Date;
    dateTo: Date;
}

type ExportFormat = 'csv' | 'excel' | 'pdf';
type ReportType = 'content' | 'tokens' | 'costs' | 'audit';

export default function ExportReports({ tenantId, dateFrom, dateTo }: ExportReportsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [format, setFormat] = useState<ExportFormat>('csv');
    const [reportType, setReportType] = useState<ReportType>('content');
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams({
                format,
                report_type: reportType,
                from_date: dateFrom.toISOString(),
                to_date: dateTo.toISOString(),
                ...(tenantId && { tenant_id: tenantId.toString() })
            });

            const response = await api.get(`/export/report?${params}`, {
                responseType: 'blob'
            });

            // Create download link
            const blob = new Blob([response.data], {
                type: getContentType(format)
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setIsOpen(false);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const getContentType = (fmt: ExportFormat) => {
        switch (fmt) {
            case 'csv': return 'text/csv';
            case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'pdf': return 'application/pdf';
        }
    };

    const REPORT_TYPES = [
        { id: 'content', label: 'Content Report', desc: 'Content queue items with status and metrics' },
        { id: 'tokens', label: 'Token Usage', desc: 'AI token consumption by agent' },
        { id: 'costs', label: 'Cost Report', desc: 'Cost breakdown by content and model' },
        { id: 'audit', label: 'Audit Log', desc: 'User actions and system events' },
    ];

    const FORMATS = [
        { id: 'csv', label: 'CSV', icon: FileSpreadsheet },
        { id: 'excel', label: 'Excel', icon: FileSpreadsheet },
        { id: 'pdf', label: 'PDF', icon: FileText },
    ];

    return (
        <>
            <Button variant="secondary" onClick={() => setIsOpen(true)}>
                <Download size={16} />
                Export
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Export Report"
                size="md"
            >
                <div className="space-y-6">
                    {/* Report Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
                        <div className="space-y-2">
                            {REPORT_TYPES.map((type) => (
                                <label
                                    key={type.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${reportType === type.id
                                            ? 'border-indigo-500 bg-indigo-600/20'
                                            : 'border-gray-700 hover:border-gray-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="reportType"
                                        value={type.id}
                                        checked={reportType === type.id}
                                        onChange={() => setReportType(type.id as ReportType)}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-white">{type.label}</div>
                                        <div className="text-sm text-gray-400">{type.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Format */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                        <div className="flex gap-2">
                            {FORMATS.map((fmt) => (
                                <button
                                    key={fmt.id}
                                    onClick={() => setFormat(fmt.id as ExportFormat)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${format === fmt.id
                                            ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <fmt.icon size={16} />
                                    {fmt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Range Info */}
                    <div className="p-3 bg-gray-900 rounded-lg">
                        <div className="text-sm text-gray-400">Date Range</div>
                        <div className="text-white">
                            {dateFrom.toLocaleDateString()} - {dateTo.toLocaleDateString()}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleExport} disabled={exporting}>
                            {exporting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Export {format.toUpperCase()}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
