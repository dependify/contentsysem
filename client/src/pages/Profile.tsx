// User Profile Page
import { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, Camera, Save, Key, Building } from 'lucide-react';
import { Button, Card, CardContent, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface UserProfile {
    id: number;
    email: string;
    role: string;
    tenant_id: number | null;
    tenant_name?: string;
    avatar_url?: string;
    created_at: string;
}

export default function Profile() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/users/${user?.id}`);
            if (res.data.success) {
                setProfile(res.data.user);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            setSaving(true);
            const res = await api.post(`/users/${user?.id}/avatar`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                setProfile(prev => prev ? { ...prev, avatar_url: res.data.avatar_url } : null);
                setMessage({ type: 'success', text: 'Avatar updated successfully!' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update avatar' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
            return;
        }

        try {
            setSaving(true);
            const res = await api.post(`/users/${user?.id}/change-password`, {
                current_password: currentPassword,
                new_password: newPassword
            });
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold">My Profile</h2>
                <p className="text-gray-400 mt-2">Manage your account settings and preferences</p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Profile Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div
                                onClick={handleAvatarClick}
                                className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                            >
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-white">
                                        {profile?.email?.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleAvatarClick}
                                className="absolute -bottom-1 -right-1 p-1.5 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                            >
                                <Camera size={14} className="text-white" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-2">
                                <Mail size={16} className="text-gray-500" />
                                <span className="text-lg">{profile?.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-gray-500" />
                                <span className="px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded text-sm capitalize">
                                    {profile?.role}
                                </span>
                            </div>
                            {profile?.tenant_name && (
                                <div className="flex items-center gap-2">
                                    <Building size={16} className="text-gray-500" />
                                    <span className="text-gray-300">{profile.tenant_name}</span>
                                </div>
                            )}
                            <div className="text-sm text-gray-500">
                                Member since {new Date(profile?.created_at || '').toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Key size={20} />
                        Change Password
                    </h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <Button type="submit" loading={saving}>
                            <Save size={16} /> Update Password
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h3>
                    <p className="text-gray-400 mb-4">
                        Logging out will end your current session. You'll need to sign in again to access your account.
                    </p>
                    <Button variant="danger" onClick={logout}>
                        Sign Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
