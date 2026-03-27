'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const { login, user, loading: authLoading } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/');
        }
    }, [user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', {
                username: identifier, // Backend handles either username or email as 'username' usually, or separate fields
                password
            });
            
            if (response.data.token && response.data.user) {
                login(response.data.token, response.data.user);
                router.replace('/');
            } else {
                setError('Invalid server response');
            }
        } catch (err: any) {
            console.error('Login failed:', err);
            setError(err.response?.data?.message || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo or Brand */}
                <div className="flex justify-center mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <User className="text-white w-6 h-6" />
                    </div>
                </div>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-slate-400">Access your digital persona</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                <Mail className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-800 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                                placeholder="Username or Email"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-800 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                                placeholder="Password"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0" />
                            <span className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">Remember me</span>
                        </label>
                        <Link href="/forgot-password" disable-size="sm" className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center mt-10 text-slate-500">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                        Create Account
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
