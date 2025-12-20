// Tenant Switcher Dropdown Component
import { useState, useEffect, useRef } from 'react';
import { Building, ChevronDown, Check, Plus, Search } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import api from '../lib/api';

// Use Tenant type from context API response (only id and business_name needed for display)
type TenantInfo = {
    id: number;
    business_name: string;
};

export default function TenantSwitcher() {
    const { currentTenant, setCurrentTenant } = useTenant();
    const [tenants, setTenants] = useState<TenantInfo[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTenants();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/tenants');
            if (res.data.success) {
                setTenants(res.data.tenants);
                // Set first tenant as default if none selected
                if (!currentTenant && res.data.tenants.length > 0) {
                    setCurrentTenant(res.data.tenants[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTenantSelect = (tenant: TenantInfo) => {
        // Cast to full Tenant type for context (API returns full objects)
        setCurrentTenant(tenant as any);
        setIsOpen(false);
        setSearchQuery('');
    };

    const filteredTenants = tenants.filter(tenant =>
        tenant.business_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg animate-pulse">
                <Building size={18} className="text-gray-500" />
                <div className="h-4 w-24 bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (tenants.length === 0) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors min-w-[180px]"
            >
                <Building size={18} className="text-indigo-400" />
                <span className="flex-1 text-left text-sm truncate">
                    {currentTenant?.business_name || 'Select Tenant'}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[250px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    {/* Search */}
                    <div className="p-2 border-b border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search tenants..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded pl-8 pr-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Tenant List */}
                    <div className="max-h-60 overflow-y-auto py-1">
                        {filteredTenants.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No tenants found</div>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <button
                                    key={tenant.id}
                                    onClick={() => handleTenantSelect(tenant)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${currentTenant?.id === tenant.id ? 'bg-gray-700/50' : ''
                                        }`}
                                >
                                    <Building size={16} className="text-gray-500" />
                                    <span className="flex-1 text-left truncate">{tenant.business_name}</span>
                                    {currentTenant?.id === tenant.id && (
                                        <Check size={16} className="text-indigo-400" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Add New Tenant */}
                    <div className="border-t border-gray-700 p-2">
                        <a
                            href="/tenants/new"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:bg-gray-700 rounded transition-colors"
                        >
                            <Plus size={16} />
                            Add New Tenant
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
