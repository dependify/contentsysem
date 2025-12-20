// Tenant Onboarding Wizard - Step-by-step tenant setup
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building, Globe, FileText, Check, ArrowRight, ArrowLeft
} from 'lucide-react';
import { Button, Card, CardContent, Input, Textarea, Toggle } from '../components/ui';
import { useTenant } from '../context/TenantContext';
import api from '../lib/api';

interface WizardData {
  business_name: string;
  domain_url: string;
  niche: string;
  brand_voice: string;
  icp_profile: string;
  wp_url: string;
  wp_username: string;
  wp_password: string;
  auto_publish: boolean;
}

const STEPS = [
  { id: 'basics', title: 'Business Info', icon: Building },
  { id: 'branding', title: 'Brand Voice', icon: FileText },
  { id: 'wordpress', title: 'WordPress', icon: Globe },
  { id: 'review', title: 'Review', icon: Check },
];

export default function TenantOnboarding() {
  const navigate = useNavigate();
  const { createTenant } = useTenant();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wpValidating, setWpValidating] = useState(false);
  const [wpValid, setWpValid] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const [data, setData] = useState<WizardData>({
    business_name: '',
    domain_url: '',
    niche: '',
    brand_voice: '',
    icp_profile: '',
    wp_url: '',
    wp_username: '',
    wp_password: '',
    auto_publish: false,
  });

  const updateData = (field: keyof WizardData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 0: // Basics
        if (!data.business_name.trim()) {
          setError('Business name is required');
          return false;
        }
        break;
      case 1: // Branding
        // Optional step
        break;
      case 2: // WordPress
        // Optional step
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleValidateWordPress = async () => {
    if (!data.wp_url || !data.wp_username || !data.wp_password) {
      setError('All WordPress fields are required to test connection');
      return;
    }

    setWpValidating(true);
    try {
      const response = await api.post('/tenants/validate-wordpress', {
        url: data.wp_url,
        username: data.wp_username,
        app_password: data.wp_password,
      });
      setWpValid(response.data.valid);
    } catch {
      setWpValid(false);
    } finally {
      setWpValidating(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      let icpProfile: any = data.icp_profile;
      try {
        icpProfile = JSON.parse(data.icp_profile);
      } catch {
        // Keep as string
      }

      await createTenant({
        business_name: data.business_name,
        domain_url: data.domain_url,
        niche: data.niche,
        brand_voice: data.brand_voice,
        icp_profile: icpProfile,
        auto_publish: data.auto_publish,
        wp_credentials: data.wp_url ? {
          url: data.wp_url,
          username: data.wp_username,
          app_password: data.wp_password,
        } : undefined,
      });

      navigate('/tenants');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basics
        return (
          <div className="space-y-4">
            <Input
              label="Business Name *"
              value={data.business_name}
              onChange={(e) => updateData('business_name', e.target.value)}
              placeholder="Acme Corp"
              hint="The name of the business you're creating content for"
            />
            <Input
              label="Website Domain"
              value={data.domain_url}
              onChange={(e) => updateData('domain_url', e.target.value)}
              placeholder="https://example.com"
            />
            <Input
              label="Industry / Niche"
              value={data.niche}
              onChange={(e) => updateData('niche', e.target.value)}
              placeholder="e.g., SaaS, Healthcare, E-commerce"
            />
          </div>
        );

      case 1: // Branding
        return (
          <div className="space-y-4">
            <Textarea
              label="Brand Voice"
              value={data.brand_voice}
              onChange={(e) => updateData('brand_voice', e.target.value)}
              placeholder="Describe your brand's tone, style, and personality..."
              hint="This helps the AI write content that matches your brand identity"
            />
            <Textarea
              label="Ideal Customer Profile (ICP)"
              value={data.icp_profile}
              onChange={(e) => updateData('icp_profile', e.target.value)}
              placeholder="Describe your target audience, their pain points, and goals..."
              hint="You can also use JSON format for structured data"
            />
          </div>
        );

      case 2: // WordPress
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
              <p className="text-blue-300 text-sm">
                Connect your WordPress site to automatically publish generated content.
                This step is optional - you can configure it later.
              </p>
            </div>

            <Input
              label="WordPress Site URL"
              value={data.wp_url}
              onChange={(e) => { updateData('wp_url', e.target.value); setWpValid(null); }}
              placeholder="https://yoursite.com"
            />
            <Input
              label="Admin Username"
              value={data.wp_username}
              onChange={(e) => { updateData('wp_username', e.target.value); setWpValid(null); }}
            />
            <Input
              label="Application Password"
              type="password"
              value={data.wp_password}
              onChange={(e) => { updateData('wp_password', e.target.value); setWpValid(null); }}
              hint="Generate from Users → Profile → Application Passwords in WordPress"
            />

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleValidateWordPress}
                loading={wpValidating}
                disabled={!data.wp_url || !data.wp_username || !data.wp_password}
              >
                Test Connection
              </Button>
              {wpValid === true && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <Check size={16} /> Connection successful
                </span>
              )}
              {wpValid === false && (
                <span className="text-red-400 text-sm">Connection failed</span>
              )}
            </div>

            <Toggle
              label="Auto-publish content when complete"
              checked={data.auto_publish}
              onChange={(checked) => updateData('auto_publish', checked)}
            />
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Business Info</h4>
              <dl className="bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Name</dt>
                  <dd className="text-white">{data.business_name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Domain</dt>
                  <dd className="text-white">{data.domain_url || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Niche</dt>
                  <dd className="text-white">{data.niche || '—'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">WordPress</h4>
              <dl className="bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Site URL</dt>
                  <dd className="text-white">{data.wp_url || 'Not configured'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Auto-publish</dt>
                  <dd className="text-white">{data.auto_publish ? 'Enabled' : 'Disabled'}</dd>
                </div>
              </dl>
            </div>

            {data.brand_voice && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Brand Voice</h4>
                <p className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm">
                  {data.brand_voice.substring(0, 200)}
                  {data.brand_voice.length > 200 && '...'}
                </p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' :
                  isComplete ? 'bg-green-600/20 text-green-400' :
                    'bg-gray-800 text-gray-500'
                  }`}
              >
                {isComplete ? (
                  <Check size={18} />
                ) : (
                  <Icon size={18} />
                )}
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-8 md:w-16 h-0.5 mx-2 ${isComplete ? 'bg-green-600' : 'bg-gray-700'
                  }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            {STEPS[currentStep].title}
          </h2>

          {error && (
            <div className="p-3 mb-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {renderStepContent()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft size={16} /> Back
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                Next <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={loading}>
                <Check size={16} /> Create Tenant
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skip Option */}
      {currentStep > 0 && currentStep < STEPS.length - 1 && (
        <p className="text-center mt-4 text-gray-500 text-sm">
          <button
            onClick={handleNext}
            className="text-indigo-400 hover:underline"
          >
            Skip this step
          </button>
        </p>
      )}
    </div>
  );
}
