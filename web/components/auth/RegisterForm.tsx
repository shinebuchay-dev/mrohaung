'use client';

import { useState } from 'react';
import { Mail, Lock, User, Phone, Calendar, Loader2, ArrowRight, ShieldCheck, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

interface RegisterFormProps {
    onSuccess?: () => void;
    onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
    const { login } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/register', {
                displayName,
                email,
                password,
                phoneNumber: phone,
                dob,
                gender
            });

            // 🔍 DEBUG: Log registration response
            console.log('=== REGISTER DEBUG START ===');
            console.log('Registration Response:', response.data);
            console.log('Token:', response.data?.token);
            console.log('User:', response.data?.user);
            console.log('=== REGISTER DEBUG END ===');

            const { token, user } = response.data;

            setSuccess(true);

            // Auto-login if token is provided
            if (token && user) {
                console.log('✅ Auto-login with token...');
                setTimeout(() => {
                    login(token, user);
                    if (onSuccess) onSuccess();
                }, 500);
            } else {
                console.warn('⚠️ No token/user in registration response');
                if (onSuccess) {
                    setTimeout(() => {
                        onSuccess();
                    }, 1500);
                } else {
                    setTimeout(() => {
                        router.push('/login');
                    }, 2000);
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please verify inputs.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginClick = () => {
        if (onSwitchToLogin) {
            onSwitchToLogin();
        } else {
            router.push('/login');
        }
    };

    return (
        <div className="w-full">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Sign Up</h1>
                <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">Create a new digital identity</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-4">
                    {/* Display Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Identity Name</label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl group-focus-within:bg-blue-500/10 transition-all opacity-0 group-focus-within:opacity-100"></div>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="e.g. Shine Bu Chay"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all font-medium text-sm backdrop-blur-sm"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                        <div className="relative group">
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

                    {/* Phone + Gender Split */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Phone</label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+959..."
                                    className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all font-medium text-sm backdrop-blur-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Gender</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full px-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all font-medium text-sm backdrop-blur-sm appearance-none cursor-pointer"
                                required
                            >
                                <option value="" className="bg-slate-900 text-slate-500">Select</option>
                                <option value="male" className="bg-slate-900">Male</option>
                                <option value="female" className="bg-slate-900">Female</option>
                                <option value="other" className="bg-slate-900">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* DOB */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all font-medium text-sm backdrop-blur-sm [color-scheme:dark]"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Secure Password</label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-purple-500/5 rounded-2xl blur-xl group-focus-within:bg-purple-500/10 transition-all opacity-0 group-focus-within:opacity-100"></div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-900/40 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all font-medium text-sm backdrop-blur-sm"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2 space-y-4">
                    <button
                        type="submit"
                        disabled={loading || success}
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
                                    Creating Profile...
                                </motion.div>
                            ) : success ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-green-600"
                                >
                                    Welcome Aboard!
                                    <ShieldCheck className="w-5 h-5" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="text"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2"
                                >
                                    Create Account
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>

                    <button
                        type="button"
                        onClick={handleLoginClick}
                        className="w-full py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-2xl border border-white/5 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                    >
                        <LogIn className="w-4 h-4" />
                        Log In Instead
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
