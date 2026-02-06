'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Github, Chrome } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;

            // Store token in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect to home page
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 rounded-2xl bg-[#1e293b]/50 backdrop-blur-xl border border-[#334155] shadow-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 mb-4 shadow-lg shadow-blue-500/20">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome to MROHAUNG</h1>
                    <p className="text-[#94a3b8]">Sign in to continue your journey</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#94a3b8] ml-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b] group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full pl-11 pr-4 py-3 bg-[#0f172a]/50 border border-[#334155] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-sm font-medium text-[#94a3b8]">Password</label>
                            <a href="#" className="text-xs text-blue-500 hover:text-blue-400 font-medium">Forgot password?</a>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b] group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-4 py-3 bg-[#0f172a]/50 border border-[#334155] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <p className="text-sm text-red-400 text-center">{error}</p>
                        </div>
                    )}
                </form>

                <div className="mt-8 flex items-center justify-center gap-4">
                    <div className="h-px flex-1 bg-[#334155]" />
                    <span className="text-xs text-[#64748b] uppercase tracking-wider font-semibold">Or continue with</span>
                    <div className="h-px flex-1 bg-[#334155]" />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0f172a]/50 border border-[#334155] rounded-xl text-white hover:bg-[#1e293b] transition-colors">
                        <Chrome className="w-4 h-4" />
                        <span className="text-sm font-medium">Google</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0f172a]/50 border border-[#334155] rounded-xl text-white hover:bg-[#1e293b] transition-colors">
                        <Github className="w-4 h-4" />
                        <span className="text-sm font-medium">GitHub</span>
                    </button>
                </div>

                <p className="mt-8 text-center text-[#94a3b8] text-sm">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-500 hover:text-blue-400 font-semibold underline-offset-4 hover:underline">
                        Sign up for free
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
