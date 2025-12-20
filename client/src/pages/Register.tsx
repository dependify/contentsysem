// Registration page with email verification placeholder
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '../components/ui';
import { UserPlus, Mail, Lock, Building, ArrowLeft, Check } from 'lucide-react';
import api from '../lib/api';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        businessName: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password strength
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                email: formData.email,
                password: formData.password,
                business_name: formData.businessName,
            });

            if (response.data.success) {
                setSuccess(true);
            } else {
                setError(response.data.error || 'Registration failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
                        <p className="text-gray-400 mb-6">
                            We've sent a verification link to <strong>{formData.email}</strong>.
                            Please check your inbox and click the link to verify your account.
                        </p>
                        <Button onClick={() => navigate('/login')} className="w-full">
                            Go to Login
                        </Button>
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
                    <p className="text-gray-400">Create your account</p>
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
                                <label className="label">Business Name</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        className="input pl-10"
                                        placeholder="Your company name"
                                        value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        className="input pl-10"
                                        placeholder="you@company.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="password"
                                        className="input pl-10"
                                        placeholder="Min. 8 characters"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" loading={loading} className="w-full">
                                <UserPlus size={18} />
                                Create Account
                            </Button>

                            <div className="text-center text-sm text-gray-400">
                                Already have an account?{' '}
                                <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                                    Sign in
                                </Link>
                            </div>
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
