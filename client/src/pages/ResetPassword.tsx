// Reset Password page
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '../components/ui';
import { Lock, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import api from '../lib/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setValidating(false);
                return;
            }

            try {
                const response = await api.post('/auth/validate-reset-token', { token });
                setTokenValid(response.data.valid);
            } catch {
                setTokenValid(false);
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/reset-password', { token, password });
            if (response.data.success) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(response.data.error || 'Failed to reset password');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!token || !tokenValid) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Invalid or Expired Link</h2>
                        <p className="text-gray-400 mb-6">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Link to="/forgot-password">
                            <Button className="w-full">Request New Link</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
                        <p className="text-gray-400 mb-6">
                            Your password has been successfully reset. Redirecting to login...
                        </p>
                        <Link to="/login">
                            <Button className="w-full">Go to Login</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">ContentSys</h1>
                    <p className="text-gray-400">Create a new password</p>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="label">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="password"
                                        className="input pl-10"
                                        placeholder="Min. 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="password"
                                        className="input pl-10"
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" loading={loading} className="w-full">
                                Reset Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 mt-4 text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to login
                </Link>
            </div>
        </div>
    );
}
