'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, Loader2, ArrowRight, ShieldCheck, Calendar, UserCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function RegisterPage() {
    const router = useRouter();
    const { login, user, loading: authLoading } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    
    // Custom Date States
    const [birthDay, setBirthDay] = useState('');
    const [birthMonth, setBirthMonth] = useState('');
    const [birthYear, setBirthYear] = useState('');
    
    const [gender, setGender] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Generate years from current back to 1920
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);
    }, []);

    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/');
        }
    }, [user, authLoading, router]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Construct DOB string: YYYY-MM-DD
        if (!birthDay || !birthMonth || !birthYear) {
            setError('Please complete your date of birth');
            setLoading(false);
            return;
        }
        
        const formattedDay = birthDay.padStart(2, '0');
        const dob = `${birthYear}-${birthMonth}-${formattedDay}`;

        try {
            const response = await api.post('/auth/register', {
                displayName,
                email,
                password,
                phoneNumber: phone,
                dob,
                gender: gender || 'other'
            });

            const { token, user: newUser } = response.data;
            setSuccess(true);

            if (token && newUser) {
                setTimeout(() => {
                    login(token, newUser);
                    router.replace('/');
                }, 1000);
            } else {
                router.push('/login');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please verify inputs.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return null;

    const genderOptions = [
        { id: 'male', label: 'Male', icon: <User className="w-4 h-4" /> },
        { id: 'female', label: 'Female', icon: <UserCheck className="w-4 h-4" /> },
        { id: 'other', label: 'Other', icon: <Sparkles className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center p-6 py-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2 font-inter tracking-tight">Create Account</h1>
                    <p className="text-slate-400">Start your digital journey today</p>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} className="space-y-6">
                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Display Name */}
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full bg-slate-100/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-medium text-sm"
                                placeholder="Full Name"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-100/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-medium text-sm"
                                placeholder="Email Address"
                                required
                            />
                        </div>

                        {/* Phone */}
                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-slate-100/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-medium text-sm"
                                placeholder="Phone Number"
                                required
                            />
                        </div>

                        {/* Custom Date of Birth Selector */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-semibold text-slate-500 ml-1 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                Date of Birth
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <select
                                    value={birthDay}
                                    onChange={(e) => setBirthDay(e.target.value)}
                                    className="bg-slate-100/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3.5 px-4 text-slate-800 dark:text-white outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-medium text-sm appearance-none cursor-pointer scrollbar-hide"
                                    required
                                >
                                    <option value="" className="text-slate-500">Day</option>
                                    {days.map(d => (
                                        <option key={d} value={d} className="bg-slate-900">{d}</option>
                                    ))}
                                </select>

                                <select
                                    value={birthMonth}
                                    onChange={(e) => setBirthMonth(e.target.value)}
                                    className="bg-slate-100/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3.5 px-4 text-slate-800 dark:text-white outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-medium text-sm appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" className="text-slate-500">Month</option>
                                    {months.map(m => (
                                        <option key={m.value} value={m.value} className="bg-slate-900">{m.label}</option>
                                    ))}
                                </select>

                                <select
                                    value={birthYear}
                                    onChange={(e) => setBirthYear(e.target.value)}
                                    className="bg-slate-100/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3.5 px-4 text-slate-800 dark:text-white outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-medium text-sm appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" className="text-slate-500">Year</option>
                                    {years.map(y => (
                                        <option key={y} value={y} className="bg-slate-900">{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Gender Selector (Modern Icon Pilles) */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-semibold text-slate-500 ml-1">Gender Identity</label>
                            <div className="flex gap-2">
                                {genderOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setGender(opt.id)}
                                        className={`flex-1 py-3.5 rounded-2xl border transition-all font-semibold text-sm capitalize flex items-center justify-center gap-2 ${
                                            gender === opt.id 
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98]' 
                                            : 'bg-slate-100/5 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10 active:scale-[0.98]'
                                        }`}
                                    >
                                        <span className={`shrink-0 ${gender === opt.id ? 'text-white' : 'text-slate-400'}`}>
                                            {opt.icon}
                                        </span>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Password */}
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-100/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-medium text-sm"
                                placeholder="Create Secure Password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                    >
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Profile...
                                </motion.div>
                            ) : success ? (
                                <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-white">
                                    Welcome Aboard!
                                    <ShieldCheck className="w-5 h-5" />
                                </motion.div>
                            ) : (
                                <motion.div key="default" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                                    Complete Sign Up
                                    <ArrowRight className="w-4 h-4" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center mt-10 text-slate-500 text-sm">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                        Sign In
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
