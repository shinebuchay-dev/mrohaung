'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, Copy, CheckCheck, Clock, XCircle, AtSign } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

export default function EmailPage() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [emailApp, setEmailApp] = useState<any>(null);
    const [emailPrefix, setEmailPrefix] = useState('');
    const [emailApplying, setEmailApplying] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            if (user?.username) setEmailPrefix(user.username);
        }
        fetchEmailApplication();
    }, []);

    const fetchEmailApplication = async () => {
        try {
            setLoading(true);
            const res = await api.get('/email-applications/me');
            setEmailApp(res.data.application);
        } catch (err: any) {
            console.error('Failed to fetch email application', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyEmail = async () => {
        setEmailError('');
        if (!emailPrefix || !/^[a-z0-9._-]{3,32}$/.test(emailPrefix)) {
            setEmailError('3-32 character, a-z 0-9 . - _ သာ သုံးနိုင်သည်');
            return;
        }
        setEmailApplying(true);
        try {
            const res = await api.post('/email-applications', { emailPrefix });
            setEmailApp(res.data.application);
            setShowEmailForm(false);
        } catch (err: any) {
            setEmailError(err.response?.data?.message || 'Failed to apply');
        } finally {
            setEmailApplying(false);
        }
    };

    const handleCancelEmailApp = async () => {
        if (!confirm('Cancel your email application?')) return;
        try {
            await api.delete('/email-applications/me');
            setEmailApp(null);
            setShowEmailForm(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to cancel');
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <ProtectedRoute>
            <div className="max-w-3xl mx-auto pb-20">
                <div className="mb-8 mt-4 hidden md:block">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Email Address</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Get your own unique @mrohaung.com personal email</p>
                </div>
                
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Mail className="w-5 h-5 text-indigo-500" /> MROHAUNG Email
                        </h2>
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full">@mrohaung.com</span>
                    </div>
                    
                    <div className="p-5">
                        {loading ? (
                            <div className="py-10 text-center flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                                <p className="mt-4 text-sm font-medium text-slate-500">Checking email status...</p>
                            </div>
                        ) : (
                            <>
                                {!emailApp && !showEmailForm && (
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-1">Get your own @mrohaung.com email</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                                            Create your personal <span className="font-bold text-indigo-500">you@mrohaung.com</span> email address.
                                            You will instantly receive SMTP credentials to use with any mail client (Outlook, Gmail app, Apple Mail, etc.) once created.
                                        </p>
                                        <button
                                            onClick={() => setShowEmailForm(true)}
                                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                        >
                                            <AtSign className="w-4 h-4" /> Create Email
                                        </button>
                                    </div>
                                )}

                                {!emailApp && showEmailForm && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Choose your email prefix</label>
                                            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30">
                                                <input
                                                    value={emailPrefix}
                                                    onChange={e => { setEmailPrefix(e.target.value.toLowerCase()); setEmailError(''); }}
                                                    placeholder="yourname"
                                                    className="flex-1 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                                                />
                                                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-bold border-l border-slate-200 dark:border-white/10 whitespace-nowrap">
                                                    @mrohaung.com
                                                </div>
                                            </div>
                                            {emailError && <p className="text-red-500 text-xs mt-1.5 font-medium">{emailError}</p>}
                                            <p className="text-xs text-slate-400 mt-1.5">Only a-z, 0-9, dot, dash, underscore. 3-32 characters.</p>
                                        </div>
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-sm text-indigo-700 dark:text-indigo-400">
                                            Preview: <span className="font-black">{emailPrefix || 'yourname'}@mrohaung.com</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleApplyEmail}
                                                disabled={emailApplying}
                                                className="flex-1 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all active:scale-95"
                                            >
                                                {emailApplying ? 'Creating...' : 'Create Email'}
                                            </button>
                                            <button
                                                onClick={() => { setShowEmailForm(false); setEmailError(''); }}
                                                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {emailApp?.status === 'pending' && (
                                    <div>
                                        <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 mb-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                                                <p className="font-bold text-blue-700 dark:text-blue-400">Application Under Review</p>
                                            </div>
                                            <p className="text-sm text-blue-600 dark:text-blue-500 font-medium tracking-tight">
                                                Your request for <span className="font-black">{emailApp.fullEmail}</span> is being reviewed by admin.
                                            </p>
                                        </div>
                                        <button onClick={handleCancelEmailApp} className="text-sm bg-red-50 text-red-500 hover:text-red-600 font-bold px-4 py-2 rounded-lg">
                                            Cancel Application
                                        </button>
                                    </div>
                                )}

                                {emailApp?.status === 'approved' && (
                                    <div className="space-y-4">
                                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-5">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                                <p className="font-bold text-emerald-700 dark:text-emerald-400">Email Approved!</p>
                                            </div>
                                            <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-4 leading-relaxed">
                                                Your <span className="font-black">{emailApp.fullEmail}</span> email is ready. Use these credentials with any mail client.
                                            </p>
                                            <div className="space-y-0 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                                                {[
                                                    { label: 'Email Address', value: emailApp.fullEmail, key: 'email' },
                                                    { label: 'Password', value: emailApp.smtpPassword, key: 'pass' },
                                                    { label: 'SMTP Server', value: 'smtp.hostinger.com', key: 'smtp' },
                                                    { label: 'SMTP Port', value: '465 (SSL)', key: 'port' },
                                                    { label: 'IMAP Server', value: 'imap.hostinger.com', key: 'imap' },
                                                    { label: 'IMAP Port', value: '993 (SSL)', key: 'iport' },
                                                ].map(row => (
                                                    <div key={row.key} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-white/5">
                                                        <div className="pr-4">
                                                            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">{row.label}</p>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 font-mono break-all">{row.value}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(row.value, row.key)}
                                                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0"
                                                        >
                                                            {copiedField === row.key ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {emailApp.notes && (
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-white/5">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Note</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-300">{emailApp.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {emailApp?.status === 'rejected' && (
                                    <div className="space-y-4">
                                        <div className="bg-red-50 dark:bg-red-500/10 p-5 rounded-2xl border border-red-100 dark:border-red-500/20">
                                            <div className="flex items-center gap-3 mb-2">
                                                <XCircle className="w-5 h-5 text-red-500" />
                                                <p className="font-bold text-red-700 dark:text-red-400">Application Rejected</p>
                                            </div>
                                            <p className="text-sm text-red-600 dark:text-red-500 font-medium">
                                                Your request for <span className="font-black">{emailApp.fullEmail}</span> was not approved.
                                                {emailApp.notes && ` Reason: "${emailApp.notes}"`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleCancelEmailApp}
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95"
                                        >
                                            Apply with different email
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
