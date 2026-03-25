'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your account...');

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid verification link. No token found.');
                return;
            }

            try {
                const response = await api.post('/auth/verify', { token });
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');
            } catch (error: any) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. The link may be expired or invalid.');
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/5 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative z-10 w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center"
            >
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-50 mb-6 p-1">
                        <div className={cn(
                            "w-full h-full rounded-2xl flex items-center justify-center shadow-lg",
                            status === 'loading' && "bg-indigo-600 text-white",
                            status === 'success' && "bg-emerald-500 text-white",
                            status === 'error' && "bg-rose-500 text-white"
                        )}>
                            {status === 'loading' && <Loader2 className="w-10 h-10 animate-spin" />}
                            {status === 'success' && <CheckCircle className="w-10 h-10" />}
                            {status === 'error' && <XCircle className="w-10 h-10" />}
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                        {status === 'loading' && "Verifying Account"}
                        {status === 'success' && "Verification Success!"}
                        {status === 'error' && "Verification Failed"}
                    </h1>

                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        {message}
                    </p>
                </div>

                {status !== 'loading' && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push('/login')}
                        className={cn(
                            "w-full py-5 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-2 uppercase tracking-wider transition-all",
                            status === 'success'
                                ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25"
                                : "bg-gradient-to-r from-slate-700 to-slate-900 shadow-slate-500/25"
                        )}
                    >
                        {status === 'success' ? 'Go to Login' : 'Back to Home'}
                        <ArrowRight className="w-5 h-5" />
                    </motion.button>
                )}

                <div className="mt-10 pt-8 border-t border-slate-100 italic text-slate-400 text-sm flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Experience MROHAUNG Elite
                </div>
            </motion.div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
