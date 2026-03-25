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
        if (onSwitchToRegister) {
            onSwitchToRegister();
        } else {
            router.push('/login?mode=register');
        }
    };

    return (
        <div className="w-full">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Welcome Back</h1>
                <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">Access your digital persona</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Universal Identifier</label>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl group-focus-within:bg-blue-500/10 transition-all opacity-0 group-focus-within:opacity-100"></div>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@domain.com"
                                className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all font-medium text-sm backdrop-blur-sm"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Access Passcode</label>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-purple-500/5 rounded-2xl blur-xl group-focus-within:bg-purple-500/10 transition-all opacity-0 group-focus-within:opacity-100"></div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-purple-500 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all font-medium text-sm backdrop-blur-sm"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-2 space-y-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full relative group overflow-hidden py-4 bg-white hover:bg-slate-50 text-slate-950 font-black rounded-2xl shadow-[0_20px_40px_-12px_rgba(255,255,255,0.15)] transition-all transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                    >
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Synchronizing...
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="text"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2"
                                >
                                    Sign In Securely
                                    <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest pb-4 border-b border-white/5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        End-to-End Encrypted Auth
                    </div>

                    {/* Distinct Sign Up Button */}
                    <button
                        type="button"
                        onClick={handleSignUpClick}
                        className="w-full py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-2xl border border-white/5 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                    >
                        Create New Identity
                        <UserPlus className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-400 font-bold leading-tight">{error}</p>
                    </motion.div>
                )}
            </form>
        </div>
    );
}
