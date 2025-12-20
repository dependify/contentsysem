// Tenant Detail/Edit page
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Globe, Building, FileText, Key, 
  CheckCircle, XCircle, RefreshCw, Trash, Archive 
} from 'lucide-react';
import { 
  Button, Card, CardContent, CardHeader, Input, Textarea, 
  Toggle, Tabs, Badge, Spinner, ConfirmDialog 
} from '../components/ui';
import { useTenant } from '../context/TenantContext';
import api from '../lib/api';

interface TenantDetails {
  id: number;
  business_name: string;
  domain_url: string;
  niche: string;
  brand_voice: string;
  icp_profile: any;
  auto_publish: boolean;
  archived: boolean;
  wp_credentials: {
    url?: string;
    username?: string;
    app_password?: string;
  };
  api_config: any;
  created_at: string;
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateTenant, deleteTenant, validateWordPress, restoreTenant } = useTenant();
  
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [wpValidating, setWpValidating] = useState(false);
  const [wpStatus, setWpStatus] = useState<'none' | 'success' | 'error'>('none');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const [formData, setFormData] = useState({
    business_name: '',
    domain_url: '',
    niche: '',
    brand_voice: '',
    auto_publish: false,
    icp_profile: '',
    wp_url: '',
    wp_username: '',
    wp_password: '',
  });

  useEffect(() => {
    const fetchTenant = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await api.get(`/tenants/${id}`);
        if (response.data.success) {
          const t = response.data.tenant;
          setTenant(t);
          setFormData({
            business_name: t.business_name || '',
            domain_url: t.domain_url || '',
            niche: t.niche || '',
            brand_voice: t.brand_voice || '',
            auto_publish: t.auto_publish || false,
            icp_profile: typeof t.icp_profile === 'object' ? JSON.stringify(t.icp_profile, null, 2) : t.icp_profile || '',
            wp_url: t.wp_credentials?.url || '',
            wp_username: t.wp_credentials?.username || '',
            wp_password: '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch tenant:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [id]);

  const handleSave = async () => {
    if (!id || !tenant) return;
    
    try {
      setSaving(true);
      
      let icpProfile = formData.icp_profile;
      try {
        icpProfile = JSON.parse(formData.icp_profile);
      } catch {
        // Keep as string if not valid JSON
      }

      await updateTenant(parseInt(id), {
        business_name: formData.business_name,
        domain_url: formData.domain_url,
        niche: formData.niche,
        brand_voice: formData.brand_voice,
        auto_publish: formData.auto_publish,
        icp_profile: icpProfile,
        wp_credentials: formData.wp_url ? {
          url: formData.wp_url,
          username: formData.wp_username,
          app_password: formData.wp_password || tenant.wp_credentials?.app_password,
        } : undefined,
      });
      
      navigate('/tenants');
    } catch (error) {
      console.error('Failed to save tenant:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleValidateWP = async () => {
    if (!id) return;
    setWpValidating(true);
    setWpStatus('none');
    
    try {
      const result = await validateWordPress(parseInt(id));
      setWpStatus(result.success ? 'success' : 'error');
    } catch {
      setWpStatus('error');
    } finally {
      setWpValidating(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteTenant(parseInt(id), true);
    navigate('/tenants');
  };

  const handleArchive = async () => {
    if (!id) return;
    await deleteTenant(parseInt(id), false);
    navigate('/tenants');
  };

  const handleRestore = async () => {
    if (!id) return;
    await restoreTenant(parseInt(id));
    setTenant(prev => prev ? { ...prev, archived: false } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-gray-300">Tenant not found</h2>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/tenants')}>
          <ArrowLeft size={16} /> Back to Tenants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tenants')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{tenant.business_name}</h1>
              {tenant.archived && <Badge variant="warning">Archived</Badge>}
            </div>
            <p className="text-gray-400">{tenant.domain_url || 'No domain configured'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tenant.archived ? (
            <Button variant="success" onClick={handleRestore}>
              <RefreshCw size={16} /> Restore
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setShowArchiveConfirm(true)}>
                <Archive size={16} /> Archive
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash size={16} /> Delete
              </Button>
            </>
          )}
          <Button onClick={handleSave} loading={saving}>
            <Save size={16} /> Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'general', label: 'General', icon: <Building size={16} /> },
          { id: 'brand', label: 'Brand Voice', icon: <FileText size={16} /> },
          { id: 'wordpress', label: 'WordPress', icon: <Globe size={16} /> },
          { id: 'api', label: 'API Keys', icon: <Key size={16} /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">General Settings</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Business Name"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              required
            />
            <Input
              label="Domain URL"
              value={formData.domain_url}
              onChange={(e) => setFormData({ ...formData, domain_url: e.target.value })}
              placeholder="https://example.com"
            />
            <Input
              label="Niche / Industry"
              value={formData.niche}
              onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
              placeholder="e.g., SaaS, E-commerce, Healthcare"
            />
            <Toggle
              label="Auto-publish content to WordPress"
              checked={formData.auto_publish}
              onChange={(checked) => setFormData({ ...formData, auto_publish: checked })}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'brand' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Brand Voice & ICP</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Brand Voice"
              value={formData.brand_voice}
              onChange={(e) => setFormData({ ...formData, brand_voice: e.target.value })}
              placeholder="Describe your brand's tone, style, and personality..."
              hint="This helps the AI write content that matches your brand identity"
            />
            <Textarea
              label="ICP Profile (JSON)"
              value={formData.icp_profile}
              onChange={(e) => setFormData({ ...formData, icp_profile: e.target.value })}
              placeholder='{"target_audience": "...", "pain_points": [...], "goals": [...]}'
              hint="Define your Ideal Customer Profile in JSON format"
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'wordpress' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">WordPress Configuration</h3>
              <div className="flex items-center gap-2">
                {wpStatus === 'success' && (
                  <span className="flex items-center gap-1 text-green-400 text-sm">
                    <CheckCircle size={16} /> Connected
                  </span>
                )}
                {wpStatus === 'error' && (
                  <span className="flex items-center gap-1 text-red-400 text-sm">
                    <XCircle size={16} /> Connection Failed
                  </span>
                )}
                <Button variant="secondary" size="sm" onClick={handleValidateWP} loading={wpValidating}>
                  Test Connection
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="WordPress Site URL"
              value={formData.wp_url}
              onChange={(e) => setFormData({ ...formData, wp_url: e.target.value })}
              placeholder="https://yoursite.com"
            />
            <Input
              label="Username"
              value={formData.wp_username}
              onChange={(e) => setFormData({ ...formData, wp_username: e.target.value })}
            />
            <Input
              label="Application Password"
              type="password"
              value={formData.wp_password}
              onChange={(e) => setFormData({ ...formData, wp_password: e.target.value })}
              hint="Leave blank to keep existing password"
              placeholder="••••••••••••"
            />
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h4 className="text-sm font-medium text-blue-300 mb-2">How to get an Application Password</h4>
              <ol className="text-sm text-blue-200/70 space-y-1 list-decimal list-inside">
                <li>Go to Users → Profile in your WordPress admin</li>
                <li>Scroll to "Application Passwords"</li>
                <li>Enter "ContentSys" as the application name</li>
                <li>Click "Add New Application Password"</li>
                <li>Copy the generated password here</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'api' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">API Keys</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Manage API keys for programmatic access to this tenant's content.
            </p>
            <Button variant="secondary">
              <Key size={16} /> Generate New API Key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Tenant Permanently"
        message={`This will permanently delete "${tenant.business_name}" and all associated content. This action cannot be undone.`}
        confirmText="Delete Permanently"
        variant="danger"
      />

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Tenant"
        message={`Are you sure you want to archive "${tenant.business_name}"? You can restore it later.`}
        confirmText="Archive"
        variant="primary"
      />
    </div>
  );
}
