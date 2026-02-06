'use client';



import { useState } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { Mail, Lock, User, UserPlus, Github, Chrome, ArrowRight } from 'lucide-react';

import { motion } from 'framer-motion';

import api from '@/lib/api';



export default function RegisterPage() {

    const [username, setUsername] = useState('');

    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');

    const [success, setSuccess] = useState(false);

    const router = useRouter();



    const handleRegister = async (e: React.FormEvent) => {

        e.preventDefault();

        setLoading(true);

        setError('');



        try {

            await api.post('/auth/register', { username, email, password });

            setSuccess(true);



            // Redirect to login after 2 seconds

            setTimeout(() => {

                router.push('/login');

            }, 2000);

        } catch (err: any) {

            setError(err.response?.data?.message || 'Registration failed. Please try again.');

        } finally {

            setLoading(false);

        }

    };



    return (

        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-sans">

            {/* Background Decorative Elements */}

            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />

            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />



            <motion.div

                initial={{ opacity: 0, x: 20 }}

                animate={{ opacity: 1, x: 0 }}

                transition={{ duration: 0.5 }}

                className="w-full max-w-lg p-8 rounded-3xl bg-[#1e293b]/40 backdrop-blur-2xl border border-white/5 shadow-2xl relative z-10"

            >

                <div className="text-center mb-10">

                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 mb-6 shadow-xl shadow-blue-500/20 rotate-3">

                        <UserPlus className="w-10 h-10 text-white" />

                    </div>

                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">Join MROHAUNG</h1>

                    <p className="text-[#94a3b8] text-lg">Create your account today</p>

                </div>



                <form onSubmit={handleRegister} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="space-y-2">

                            <label className="text-sm font-semibold text-[#64748b] ml-1 uppercase tracking-wider">Username</label>

                            <div className="relative group">

                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#475569] group-focus-within:text-blue-400 transition-colors" />

                                <input

                                    type="text"

                                    value={username}

                                    onChange={(e) => setUsername(e.target.value)}

                                    placeholder="johndoe"

                                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"

                                    required

                                />

                            </div>

                        </div>



                        <div className="space-y-2">

                            <label className="text-sm font-semibold text-[#64748b] ml-1 uppercase tracking-wider">Email Address</label>

                            <div className="relative group">

                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#475569] group-focus-within:text-blue-400 transition-colors" />

                                <input

                                    type="email"

                                    value={email}

                                    onChange={(e) => setEmail(e.target.value)}

                                    placeholder="john@example.com"

                                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"

                                    required

                                />

                            </div>

                        </div>

                    </div>



                    <div className="space-y-2">

                        <label className="text-sm font-semibold text-[#64748b] ml-1 uppercase tracking-wider">Password</label>

                        <div className="relative group">

                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#475569] group-focus-within:text-blue-400 transition-colors" />

                            <input

                                type="password"

                                value={password}

                                onChange={(e) => setPassword(e.target.value)}

                                placeholder="••••••••"

                                className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"

                                required

                            />

                        </div>

                    </div>



                    <div className="flex items-center gap-2 ml-1 text-[#94a3b8] text-xs">

                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-black/20 checked:bg-blue-600 focus:ring-0" required />

                        <span>I agree to the <Link href="/terms" className="text-blue-400 hover:text-blue-300 font-medium">Terms of Service</Link> and <Link href="/privacy" className="text-blue-400 hover:text-blue-300 font-medium">Privacy Policy</Link></span>

                    </div>



                    <button

                        type="submit"

                        disabled={loading || success}

                        className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-[#e2e8f0] transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg"

                    >

                        {loading ? (

                            <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />

                        ) : success ? (

                            'Account Created! Redirecting...'

                        ) : (

                            <>

                                Create My Account

                                <ArrowRight className="w-5 h-5" />

                            </>

                        )}

                    </button>



                    {error && (

                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">

                            <p className="text-sm text-red-400 text-center">{error}</p>

                        </div>

                    )}



                    {success && (

                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">

                            <p className="text-sm text-green-400 text-center">Account created successfully! Redirecting to login...</p>

                        </div>

                    )}

                </form>



                <div className="mt-10 flex items-center justify-center gap-4">

                    <div className="h-px flex-1 bg-white/5" />

                    <span className="text-xs text-[#475569] uppercase tracking-widest font-bold">Quick Sign up</span>

                    <div className="h-px flex-1 bg-white/5" />

                </div>



                <div className="mt-6 grid grid-cols-2 gap-4">

                    <button className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-colors">

                        <Chrome className="w-5 h-5" />

                        <span className="font-semibold lg:inline hidden">Google</span>

                    </button>

                    <button className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-colors">

                        <Github className="w-5 h-5" />

                        <span className="font-semibold lg:inline hidden">GitHub</span>

                    </button>

                </div>



                <p className="mt-10 text-center text-[#64748b]">

                    Already have an account?{' '}

                    <Link href="/login" className="text-white hover:text-blue-300 font-bold ml-1 transition-colors underline-offset-4 hover:underline">

                        Login here

                    </Link>

                </p>

            </motion.div>

        </div>

    );

}

