// Tenant Context - Global tenant state management
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

interface Tenant {
    id: number;
    business_name: string;
    domain_url?: string;
    niche?: string;
    auto_publish: boolean;
    archived: boolean;
    created_at: string;
    icp_profile?: any;
    brand_voice?: string;
    wp_credentials?: any;
    api_config?: any;
}

interface TenantContextType {
    tenants: Tenant[];
    currentTenant: Tenant | null;
    loading: boolean;
    error: string | null;
    setCurrentTenant: (tenant: Tenant | null) => void;
    fetchTenants: () => Promise<void>;
    createTenant: (data: Partial<Tenant>) => Promise<Tenant>;
    updateTenant: (id: number, data: Partial<Tenant>) => Promise<void>;
    deleteTenant: (id: number, permanent?: boolean) => Promise<void>;
    restoreTenant: (id: number) => Promise<void>;
    validateWordPress: (id: number) => Promise<{ success: boolean; message: string }>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTenants = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/tenants', {
                params: user.role === 'admin' ? { include_archived: false } : undefined
            });

            if (response.data.success) {
                setTenants(response.data.tenants);

                // Auto-select first tenant if none selected
                if (!currentTenant && response.data.tenants.length > 0) {
                    // For client users, use their assigned tenant
                    if (user.tenant_id) {
                        const userTenant = response.data.tenants.find((t: Tenant) => t.id === user.tenant_id);
                        setCurrentTenant(userTenant || response.data.tenants[0]);
                    } else {
                        setCurrentTenant(response.data.tenants[0]);
                    }
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch tenants');
        } finally {
            setLoading(false);
        }
    }, [user, currentTenant]);

    useEffect(() => {
        if (user) {
            fetchTenants();
        }
    }, [user]);

    const createTenant = async (data: Partial<Tenant>): Promise<Tenant> => {
        const response = await api.post('/tenants', data);
        if (response.data.success) {
            await fetchTenants();
            return response.data;
        }
        throw new Error(response.data.error || 'Failed to create tenant');
    };

    const updateTenant = async (id: number, data: Partial<Tenant>): Promise<void> => {
        const response = await api.put(`/tenants/${id}`, data);
        if (response.data.success) {
            setTenants(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
            if (currentTenant?.id === id) {
                setCurrentTenant({ ...currentTenant, ...data });
            }
        } else {
            throw new Error(response.data.error || 'Failed to update tenant');
        }
    };

    const deleteTenant = async (id: number, permanent = false): Promise<void> => {
        const response = await api.delete(`/tenants/${id}`, { params: { permanent } });
        if (response.data.success) {
            setTenants(prev => prev.filter(t => t.id !== id));
            if (currentTenant?.id === id) {
                setCurrentTenant(tenants.find(t => t.id !== id) || null);
            }
        } else {
            throw new Error(response.data.error || 'Failed to delete tenant');
        }
    };

    const restoreTenant = async (id: number): Promise<void> => {
        const response = await api.post(`/tenants/${id}/restore`);
        if (response.data.success) {
            await fetchTenants();
        } else {
            throw new Error(response.data.error || 'Failed to restore tenant');
        }
    };

    const validateWordPress = async (id: number): Promise<{ success: boolean; message: string }> => {
        const response = await api.post(`/tenants/${id}/validate-wp`);
        return {
            success: response.data.success,
            message: response.data.message || response.data.error
        };
    };

    return (
        <TenantContext.Provider value={{
            tenants,
            currentTenant,
            loading,
            error,
            setCurrentTenant,
            fetchTenants,
            createTenant,
            updateTenant,
            deleteTenant,
            restoreTenant,
            validateWordPress,
        }}>
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}
