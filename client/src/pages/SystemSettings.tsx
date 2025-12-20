// System Configuration page for admins
import { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Input, Toggle, Tabs, Spinner } from '../components/ui';
import api from '../lib/api';

interface SystemConfig {
    openai_api_key?: string;
    anthropic_api_key?: string;
    runware_api_key?: string;
    tavily_api_key?: string;
    exa_api_key?: string;
    default_model?: string;
    max_tokens_per_request?: number;
    rate_limit_requests_per_minute?: number;
    auto_publish_default?: boolean;
    content_retention_days?: number;
    enable_webhooks?: boolean;
    webhook_secret?: string;
}

export default function SystemSettings() {
    const [config, setConfig] = useState<SystemConfig>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('ai');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const response = await api.get('/settings');
            if (response.data.success) {
                setConfig(response.data.config);
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess(false);

            const response = await api.put('/settings', config);
            if (response.data.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (key: keyof SystemConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">System Settings</h1>
                    <p className="text-gray-400">Configure global system parameters</p>
                </div>
                <div className="flex items-center gap-2">
                    {success && (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                            <Check size={16} /> Saved
                        </span>
                    )}
                    <Button variant="ghost" onClick={fetchConfig}>
                        <RefreshCw size={16} /> Reset
                    </Button>
                    <Button onClick={handleSave} loading={saving}>
                        <Save size={16} /> Save Changes
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <Tabs
                tabs={[
                    { id: 'ai', label: 'AI Providers' },
                    { id: 'limits', label: 'Rate Limits' },
                    { id: 'defaults', label: 'Defaults' },
                    { id: 'webhooks', label: 'Webhooks' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {activeTab === 'ai' && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-white">AI Provider API Keys</h3>
                        <p className="text-gray-400 text-sm">Configure API keys for AI services</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            label="OpenAI API Key"
                            type="password"
                            value={config.openai_api_key || ''}
                            onChange={(e) => updateConfig('openai_api_key', e.target.value)}
                            placeholder="sk-..."
                            hint="Required for GPT models"
                        />
                        <Input
                            label="Anthropic API Key"
                            type="password"
                            value={config.anthropic_api_key || ''}
                            onChange={(e) => updateConfig('anthropic_api_key', e.target.value)}
                            placeholder="sk-ant-..."
                            hint="Required for Claude models"
                        />
                        <Input
                            label="Runware API Key"
                            type="password"
                            value={config.runware_api_key || ''}
                            onChange={(e) => updateConfig('runware_api_key', e.target.value)}
                            hint="For AI image generation"
                        />
                        <Input
                            label="Tavily API Key"
                            type="password"
                            value={config.tavily_api_key || ''}
                            onChange={(e) => updateConfig('tavily_api_key', e.target.value)}
                            hint="For web research"
                        />
                        <Input
                            label="Exa.ai API Key"
                            type="password"
                            value={config.exa_api_key || ''}
                            onChange={(e) => updateConfig('exa_api_key', e.target.value)}
                            hint="For semantic search"
                        />
                        <div className="form-group">
                            <label className="label">Default Model</label>
                            <select
                                className="select"
                                value={config.default_model || 'gpt-4o'}
                                onChange={(e) => updateConfig('default_model', e.target.value)}
                            >
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                                <option value="claude-3-opus">Claude 3 Opus</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'limits' && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-white">Rate Limits</h3>
                        <p className="text-gray-400 text-sm">Configure system rate limits</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            label="Max Tokens per Request"
                            type="number"
                            value={config.max_tokens_per_request || 4096}
                            onChange={(e) => updateConfig('max_tokens_per_request', parseInt(e.target.value))}
                        />
                        <Input
                            label="Rate Limit (requests/minute)"
                            type="number"
                            value={config.rate_limit_requests_per_minute || 60}
                            onChange={(e) => updateConfig('rate_limit_requests_per_minute', parseInt(e.target.value))}
                        />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'defaults' && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-white">Default Settings</h3>
                        <p className="text-gray-400 text-sm">Configure default behavior</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Toggle
                            label="Auto-publish content by default"
                            checked={config.auto_publish_default || false}
                            onChange={(checked) => updateConfig('auto_publish_default', checked)}
                        />
                        <Input
                            label="Content Retention (days)"
                            type="number"
                            value={config.content_retention_days || 365}
                            onChange={(e) => updateConfig('content_retention_days', parseInt(e.target.value))}
                            hint="How long to keep generated content"
                        />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'webhooks' && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-white">Webhook Settings</h3>
                        <p className="text-gray-400 text-sm">Configure webhook notifications</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Toggle
                            label="Enable webhooks"
                            checked={config.enable_webhooks || false}
                            onChange={(checked) => updateConfig('enable_webhooks', checked)}
                        />
                        <Input
                            label="Webhook Secret"
                            type="password"
                            value={config.webhook_secret || ''}
                            onChange={(e) => updateConfig('webhook_secret', e.target.value)}
                            hint="Used to sign webhook payloads"
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
