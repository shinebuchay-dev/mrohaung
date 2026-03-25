'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

function VerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('No token provided.');
                return;
            }
            try {
                const response = await api.get(`/auth/verify/${token}`);
                setStatus('success');
                setMessage(response.data.message);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } catch (error: any) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
            }
        };
        verify();
    }, [token, router]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl text-center relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full -ml-16 -mb-16" />

                {status === 'loading' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-black text-white">Verifying Identity</h2>
                        <p className="text-slate-400">Please wait while we secure your account on the Infinity network...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 rounded-3xl bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white">Verification Complete</h2>
                        <p className="text-slate-400">{message}</p>
                        <p className="text-xs text-slate-500">Redirecting to login portal...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 rounded-3xl bg-red-500/20 flex items-center justify-center">
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white">Access Denied</h2>
                        <p className="text-slate-400">{message}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
                        >
                            Return to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyContent />
        </Suspense>
    );
}
