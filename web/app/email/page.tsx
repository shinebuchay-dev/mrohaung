'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, Copy, CheckCheck, Clock, XCircle, AtSign, Send, Inbox, UploadCloud, RefreshCw } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

function NativeWebmailUI({ 
    emailApp, copyToClipboard, copiedField, 
    sendMessage, setSendMessage, sendSubject, setSendSubject, sendTo, setSendTo, 
    handleSendEmail, sending, sendSuccess, sendError 
}: any) {
    const [activeTab, setActiveTab] = useState('inbox');
    const [inboxMails, setInboxMails] = useState<any[]>([]);
    const [sentMails, setSentMails] = useState<any[]>([]);
    const [loadingMails, setLoadingMails] = useState(false);

    const fetchMails = async () => {
        setLoadingMails(true);
        try {
            const [inboxRes, sentRes] = await Promise.all([
                api.get('/email-applications/inbox'),
                api.get('/email-applications/sent')
            ]);
            setInboxMails(inboxRes.data.emails || []);
            setSentMails(sentRes.data.emails || []);
        } catch (err) {
            console.error('Failed to load mails', err);
        } finally {
            setLoadingMails(false);
        }
    };

    useEffect(() => {
        fetchMails();
        const interval = setInterval(fetchMails, 15000); // 15 seconds polling
        return () => clearInterval(interval);
    }, []);

    const renderMailList = (mails: any[], emptyMsg: string) => {
        if (loadingMails && mails.length === 0) return <div className="p-10 text-center text-slate-400">Loading...</div>;
        if (mails.length === 0) return <div className="p-10 text-center text-slate-400 font-medium">{emptyMsg}</div>;
        return (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
                {mails.map(m => (
                    <div key={m.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{activeTab === 'inbox' ? m.fromAddress : m.toAddress}</p>
                            <p className="text-xs text-slate-400 font-medium">{new Date(m.createdAt).toLocaleString()}</p>
                        </div>
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-1">{m.subject}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{m.bodyText}</p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-[580px]">
            {/* Account Header — seamless, no card */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Signed in as</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{emailApp.fullEmail}</p>
                    </div>
                </div>
                <button
                    onClick={fetchMails}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMails ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Tab Bar — minimal underline style */}
            <div className="flex gap-6 border-b border-slate-100 dark:border-white/5 mb-4">
                {[
                    { id: 'inbox', icon: Inbox, label: 'Inbox', count: inboxMails.length },
                    { id: 'sent', icon: UploadCloud, label: 'Sent', count: sentMails.length },
                    { id: 'compose', icon: Send, label: 'Compose' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 pb-3 text-sm font-bold transition-all border-b-2 -mb-px ${
                            activeTab === tab.id
                            ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                            : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Mail List — no card wrapper, just rows */}
            <div className="flex-1">
                {(activeTab === 'inbox' || activeTab === 'sent') && (() => {
                    const mails = activeTab === 'inbox' ? inboxMails : sentMails;
                    const emptyMsg = activeTab === 'inbox' ? 'Your inbox is empty.' : 'No sent emails yet.';
                    if (loadingMails && mails.length === 0) return (
                        <div className="flex items-center gap-2 py-8 text-slate-400 text-sm">
                            <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                            Loading...
                        </div>
                    );
                    if (mails.length === 0) return (
                        <div className="py-12 text-center">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                {activeTab === 'inbox' ? <Inbox className="w-5 h-5 text-slate-400" /> : <UploadCloud className="w-5 h-5 text-slate-400" />}
                            </div>
                            <p className="text-sm font-medium text-slate-400">{emptyMsg}</p>
                        </div>
                    );
                    return (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {mails.map(m => (
                                <div key={m.id} className="py-3 hover:bg-slate-50/50 dark:hover:bg-white/2 -mx-1 px-1 rounded-lg transition-colors cursor-pointer">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate mr-2">
                                            {activeTab === 'inbox' ? m.fromAddress : m.toAddress}
                                        </p>
                                        <p className="text-[11px] text-slate-400 shrink-0">{new Date(m.createdAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-0.5">{m.subject}</p>
                                    <p className="text-xs text-slate-400 line-clamp-1">{m.bodyText}</p>
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {/* Compose — clean form, no card background */}
                {activeTab === 'compose' && (
                    <form onSubmit={handleSendEmail} className="space-y-3">
                        {sendSuccess && (
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 py-2">
                                <Check className="w-4 h-4" /> {sendSuccess}
                            </div>
                        )}
                        {sendError && (
                            <div className="flex items-center gap-2 text-sm font-bold text-red-500 py-2">
                                <XCircle className="w-4 h-4" /> {sendError}
                            </div>
                        )}
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">To</label>
                            <input
                                value={sendTo} onChange={e => setSendTo(e.target.value)}
                                placeholder="recipient@example.com"
                                className="w-full bg-transparent border-b border-slate-200 dark:border-white/10 pb-2 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Subject</label>
                            <input
                                value={sendSubject} onChange={e => setSendSubject(e.target.value)}
                                placeholder="Email Subject"
                                className="w-full bg-transparent border-b border-slate-200 dark:border-white/10 pb-2 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Message</label>
                            <textarea
                                value={sendMessage} onChange={e => setSendMessage(e.target.value)}
                                placeholder="Write your message..."
                                rows={7}
                                className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
                            />
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit" disabled={sending}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {sending ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function EmailPage() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [emailApp, setEmailApp] = useState<any>(null);
    const [emailPrefix, setEmailPrefix] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [emailApplying, setEmailApplying] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Email Sending State
    const [sendTo, setSendTo] = useState('');
    const [sendSubject, setSendSubject] = useState('');
    const [sendMessage, setSendMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState('');
    const [sendError, setSendError] = useState('');

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
        if (emailPassword.length < 6) {
            setEmailError('Password must be at least 6 characters');
            return;
        }
        setEmailApplying(true);
        try {
            const res = await api.post('/email-applications', { emailPrefix, password: emailPassword });
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

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendError('');
        setSendSuccess('');
        if (!sendTo || !sendSubject || !sendMessage) {
            setSendError('Please fill in all fields (To, Subject, Message)');
            return;
        }
        setSending(true);
        try {
            await api.post('/email-applications/send', {
                to: sendTo,
                subject: sendSubject,
                message: sendMessage
            });
            setSendSuccess('Email sent successfully!');
            setSendTo('');
            setSendSubject('');
            setSendMessage('');
            setTimeout(() => setSendSuccess(''), 5000);
        } catch (err: any) {
            setSendError(err.response?.data?.message || 'Failed to send email.');
        } finally {
            setSending(false);
        }
    };

    // If approved, show seamless full webmail (no card, no header)
    if (!loading && emailApp?.status === 'approved') {
        return (
            <ProtectedRoute>
                <div className="max-w-3xl mx-auto pb-20 pt-4">
                    <NativeWebmailUI
                        emailApp={emailApp}
                        copyToClipboard={copyToClipboard}
                        copiedField={copiedField}
                        sendMessage={sendMessage}
                        setSendMessage={setSendMessage}
                        sendSubject={sendSubject}
                        setSendSubject={setSendSubject}
                        sendTo={sendTo}
                        setSendTo={setSendTo}
                        handleSendEmail={handleSendEmail}
                        sending={sending}
                        sendSuccess={sendSuccess}
                        sendError={sendError}
                    />
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="max-w-3xl mx-auto pb-20">
                {/* Page title — only show when no approved email */}
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
                                {/* No email yet — prompt to create */}
                                {!emailApp && !showEmailForm && (
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-1">Get your own @mrohaung.com email</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                                            Create your personal <span className="font-bold text-indigo-500">you@mrohaung.com</span> email address.
                                            Send and receive emails directly from this app.
                                        </p>
                                        <button
                                            onClick={() => setShowEmailForm(true)}
                                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                        >
                                            <AtSign className="w-4 h-4" /> Create Email
                                        </button>
                                    </div>
                                )}

                                {/* Application form */}
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
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Set Mailbox Password</label>
                                            <input
                                                type="password"
                                                value={emailPassword}
                                                onChange={e => setEmailPassword(e.target.value)}
                                                placeholder="Enter a strong password"
                                                className="w-full bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                            />
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

                                {/* Pending */}
                                {emailApp?.status === 'pending' && (
                                    <div>
                                        <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 mb-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                                                <p className="font-bold text-blue-700 dark:text-blue-400">Application Under Review</p>
                                            </div>
                                            <p className="text-sm text-blue-600 dark:text-blue-500 font-medium tracking-tight">
                                                Your request for <span className="font-black">{emailApp.fullEmail}</span> is being reviewed.
                                            </p>
                                        </div>
                                        <button onClick={handleCancelEmailApp} className="text-sm bg-red-50 text-red-500 hover:text-red-600 font-bold px-4 py-2 rounded-lg">
                                            Cancel Application
                                        </button>
                                    </div>
                                )}

                                {/* Rejected */}
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
