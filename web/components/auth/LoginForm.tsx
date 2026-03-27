'use client';

import { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
    onSuccess?: () => void;
    onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { email, password });

            // 🔍 DEBUG: Log the entire response to see what backend is sending
            console.log('=== LOGIN DEBUG START ===');
            console.log('Full Response:', response);
            console.log('Response Data:', response.data);
            console.log('Token from response.data:', response.data?.token);
            console.log('User from response.data:', response.data?.user);
            console.log('=== LOGIN DEBUG END ===');

            // Validate response structure
            if (!response.data) {
                throw new Error('Invalid server response: no data received');
            }

            const { token, user } = response.data;

            // Validate token and user
            if (!token || typeof token !== 'string') {
                console.error('❌ Invalid token received:', token);
                console.error('Response data keys:', Object.keys(response.data));
                throw new Error('Invalid authentication token received from server');
            }

            if (!user || typeof user !== 'object') {
                console.error('❌ Invalid user data received:', user);
                throw new Error('Invalid user data received from server');
            }

            // Proceed with login
            console.log('✅ Login successful, calling login function...');
            login(token, user);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('❌ Login error:', err);
            console.error('Error response:', err.response);
            setError(err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUpClick = () => {
        if (onSuccess) onSuccess(); // Close modal
        router.push('/register');
    };

    return (
        <div className="w-full">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Welcome Back</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Access your digital persona</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email or Username"
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-medium"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-medium"
                        required
                    />
                </div>

                <div className="pt-2 space-y-5">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
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

                    <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                        <p className="text-center text-sm text-slate-500 mb-4">New here?</p>
                        <button
                            type="button"
                            onClick={handleSignUpClick}
                            className="w-full py-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Create New Account
                            <UserPlus className="w-4 h-4 text-blue-500" />
                        </button>
                    </div>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-400 font-bold leading-tight">{error}</p>
                    </motion.div>
                )}
            </form>
        </div>
    );
}
