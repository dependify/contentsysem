// Forgot Password page
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent } from '../components/ui';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import api from '../lib/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/forgot-password', { email });
            if (response.data.success) {
                setSuccess(true);
            } else {
                setError(response.data.error || 'Failed to send reset email');
            }
        } catch (err: any) {
            // Don't reveal if email exists or not for security
            setSuccess(true);
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
                            If an account exists for <strong>{email}</strong>, we've sent password reset instructions to your inbox.
                        </p>
                        <Link to="/login">
                            <Button className="w-full">Back to Login</Button>
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
                    <p className="text-gray-400">Reset your password</p>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            <p className="text-gray-400 text-sm">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

                            <div className="form-group">
                                <label className="label">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        className="input pl-10"
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" loading={loading} className="w-full">
                                Send Reset Link
                            </Button>

                            <div className="text-center text-sm text-gray-400">
                                Remember your password?{' '}
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
