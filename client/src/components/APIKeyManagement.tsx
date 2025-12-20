// API Key Management UI
import { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash, AlertCircle } from 'lucide-react';
import {
    Card, CardContent, Button, Input, Modal,
    Badge, ConfirmDialog, Spinner
} from '../components/ui';
import api from '../lib/api';

interface APIKey {
    id: number;
    name: string;
    key_prefix: string;
    last_used?: string;
    created_at: string;
    expires_at?: string;
    permissions: string[];
}

interface APIKeyManagementProps {
    tenantId?: number;
}

export default function APIKeyManagement({ tenantId }: APIKeyManagementProps) {
    const [keys, setKeys] = useState<APIKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKey, setNewKey] = useState<{ name: string; fullKey?: string }>({ name: '' });
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const params = tenantId ? { tenant_id: tenantId } : {};
            const response = await api.get('/api-keys', { params });
            if (response.data.success) {
                setKeys(response.data.keys);
            }
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, [tenantId]);

    const handleCreate = async () => {
        if (!newKey.name.trim()) return;

        setCreating(true);
        try {
            const response = await api.post('/api-keys', {
                name: newKey.name,
                tenant_id: tenantId,
            });

            if (response.data.success) {
                setNewKey({ name: newKey.name, fullKey: response.data.key });
                fetchKeys();
            }
        } catch (error) {
            console.error('Failed to create API key:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async () => {
        if (deleteTarget === null) return;

        try {
            await api.delete(`/api-keys/${deleteTarget}`);
            setKeys(prev => prev.filter(k => k.id !== deleteTarget));
            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete API key:', error);
        }
    };

    const handleCopy = async (text: string, id: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setNewKey({ name: '' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">API Keys</h2>
                    <p className="text-gray-400 text-sm">Manage API keys for programmatic access</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} /> Create Key
                </Button>
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-yellow-300">
                    <strong>Important:</strong> API keys provide full access to the API. Keep them secure and never
                    expose them in client-side code or public repositories.
                </div>
            </div>

            {/* Keys List */}
            {keys.length > 0 ? (
                <div className="space-y-3">
                    {keys.map((key) => (
                        <Card key={key.id}>
                            <div className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-indigo-500/20 rounded-lg">
                                    <Key className="text-indigo-400" size={20} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">{key.name}</span>
                                        {key.permissions.map((perm) => (
                                            <Badge key={perm} variant="gray" className="text-xs">
                                                {perm}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="font-mono">{key.key_prefix}...</span>
                                        <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                                        {key.last_used && (
                                            <span>Last used {new Date(key.last_used).toLocaleDateString()}</span>
                                        )}
                                        {key.expires_at && (
                                            <span className="text-yellow-400">
                                                Expires {new Date(key.expires_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteTarget(key.id)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <Trash size={16} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No API keys yet</h3>
                        <p className="text-gray-400 mb-4">Create an API key to access the API programmatically</p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus size={16} /> Create Your First Key
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={closeCreateModal}
                title={newKey.fullKey ? 'API Key Created' : 'Create API Key'}
                size="md"
            >
                {!newKey.fullKey ? (
                    <div className="space-y-4">
                        <Input
                            label="Key Name"
                            value={newKey.name}
                            onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                            placeholder="e.g., Production Server, Development"
                            hint="A descriptive name to identify this key"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={closeCreateModal}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} loading={creating} disabled={!newKey.name.trim()}>
                                Create Key
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-green-300 text-sm mb-2">
                                Your API key has been created. Copy it now - you won't be able to see it again!
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                            <div className="flex gap-2">
                                <div className="flex-1 p-3 bg-gray-800 rounded-lg font-mono text-sm text-white break-all">
                                    {newKey.fullKey}
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={() => handleCopy(newKey.fullKey!, -1)}
                                >
                                    {copiedId === -1 ? 'Copied!' : <Copy size={16} />}
                                </Button>
                            </div>
                        </div>

                        <Button className="w-full" onClick={closeCreateModal}>
                            Done
                        </Button>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete API Key"
                message="Are you sure you want to delete this API key? Any applications using this key will lose access immediately."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
