'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, Copy, CheckCheck, Clock, XCircle, AtSign, Send, Inbox, UploadCloud, RefreshCw, Trash, Trash2, ArrowRight, ChevronLeft } from 'lucide-react';
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
    const [archivedMails, setArchivedMails] = useState<any[]>([]);
    const [trashMails, setTrashMails] = useState<any[]>([]);
    const [loadingMails, setLoadingMails] = useState(false);
    const [selectedMail, setSelectedMail] = useState<any>(null);
    const [isInlineCompose, setIsInlineCompose] = useState(false);
    const [inlineMode, setInlineMode] = useState<'reply' | 'forward'>('reply');

    const handleStartInline = (mode: 'reply' | 'forward') => {
        if (!selectedMail) return;
        setInlineMode(mode);
        const originalBody = `\n\n--- ${mode === 'reply' ? 'Original' : 'Forwarded'} Message ---\nFrom: ${selectedMail.fromAddress}\nTo: ${selectedMail.toAddress}\nDate: ${new Date(selectedMail.createdAt).toLocaleString()}\n\n${selectedMail.bodyText}`;
        setSendMessage(originalBody);

        if (mode === 'reply') {
            setSendTo(selectedMail.fromAddress);
            setSendSubject(`Re: ${selectedMail.subject}`);
        } else {
            setSendTo('');
            setSendSubject(`Fwd: ${selectedMail.subject}`);
        }
        setIsInlineCompose(true);
    };

    useEffect(() => {
        if (sendSuccess) {
            const timer = setTimeout(() => setIsInlineCompose(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [sendSuccess]);

    useEffect(() => {
        setIsInlineCompose(false);
    }, [selectedMail?.id, activeTab]);

    const fetchMails = async () => {
        setLoadingMails(true);
        try {
            const [inboxRes, sentRes, archRes, trashRes] = await Promise.all([
                api.get('/email-applications/inbox'),
                api.get('/email-applications/sent'),
                api.get('/email-applications/folder/archived'),
                api.get('/email-applications/folder/trash')
            ]);
            setInboxMails(inboxRes.data.emails || []);
            setSentMails(sentRes.data.emails || []);
            setArchivedMails(archRes.data.emails || []);
            setTrashMails(trashRes.data.emails || []);
        } catch (err) {
            console.error('Failed to load mails', err);
        } finally {
            setLoadingMails(false);
        }
    };

    const handleEmailAction = async (id: string, action: string) => {
        try {
            await api.post('/email-applications/action', { emailId: id, action });
            setSelectedMail(null);
            fetchMails();
        } catch (err) {
            console.error('Action failed', err);
        }
    };

    useEffect(() => {
        fetchMails();
        const interval = setInterval(fetchMails, 15000); // 15 seconds polling
        return () => clearInterval(interval);
    }, []);

    // Deselect if tab changes
    useEffect(() => {
        setSelectedMail(null);
    }, [activeTab]);

    return (
        <div className="flex flex-col h-[calc(100dvh-150px)] md:h-auto overflow-hidden">
            {/* Header Area — Typography focus */}
            <div className="flex items-center justify-between mb-4 md:mb-8 px-1 shrink-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <div className="w-1.5 h-6 md:w-2 md:h-8 bg-blue-600 rounded-full" />
                        Webmail
                    </h1>
                    <p className="text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-0.5 ml-3 md:ml-4">{emailApp.fullEmail}</p>
                </div>
                <button
                    onClick={fetchMails}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-400 hover:text-blue-600"
                >
                    <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${loadingMails ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Tab Bar — minimalist text labels */}
            <div className="flex gap-5 md:gap-6 mb-4 md:mb-8 px-1 border-b border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar shrink-0">
                {[
                    { id: 'inbox', label: 'Inbox', count: inboxMails.length },
                    { id: 'sent', label: 'Sent', count: sentMails.length },
                    { id: 'archived', label: 'Archived', count: archivedMails.length },
                    { id: 'trash', label: 'Trash', count: trashMails.length },
                    { id: 'compose', label: 'Compose' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 md:pb-4 text-[12px] md:text-[13px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === tab.id
                                ? 'text-blue-600'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-1 opacity-50">{tab.count}</span>
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area — Dynamic Internal Scroll */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                {['inbox', 'sent', 'archived', 'trash'].includes(activeTab) && (
                    <div className="relative">
                        {/* Detail Overlay - Fully Seamless */}
                        {selectedMail && (
                            <div className="fixed inset-0 z-[200] bg-white dark:bg-[#0f172a] animate-in slide-in-from-right-full duration-400 flex flex-col">
                                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5 backdrop-blur-md sticky top-0 bg-white/80 dark:bg-[#0f172a]/80">
                                    <button onClick={() => setSelectedMail(null)} className="p-2 -ml-2 text-blue-600"><ChevronLeft className="w-6 h-6" /></button>
                                    <div className="flex gap-4">
                                        <button onClick={() => handleEmailAction(selectedMail.id, 'archive')} className="p-2 text-slate-400 hover:text-blue-600"><CheckCheck className="w-5 h-5"/></button>
                                        <button onClick={() => handleEmailAction(selectedMail.id, 'trash')} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5"/></button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto px-4 py-8 no-scrollbar">
                                    <div className="max-w-4xl mx-auto space-y-8">
                                        <div className="space-y-4">
                                            <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">{selectedMail.subject}</h1>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">{selectedMail.fromAddress[0].toUpperCase()}</div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{selectedMail.fromAddress}</p>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedMail.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-px bg-slate-100 dark:bg-white/5" />
                                        <div className="text-[16px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium pb-24">
                                            {selectedMail.bodyText}
                                        </div>
                                    </div>
                                </div>
                                {/* Floating Bottom Actions */}
                                {!isInlineCompose && activeTab !== 'trash' && (
                                    <div className="absolute bottom-10 left-4 right-4 max-w-4xl mx-auto flex gap-3">
                                        <button onClick={() => handleStartInline('reply')} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2">
                                            <Send className="w-4 h-4" /> Reply
                                        </button>
                                        <button onClick={() => handleStartInline('forward')} className="p-4 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl">
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                                
                                {isInlineCompose && (
                                    <div className="fixed inset-0 z-[210] bg-white dark:bg-[#0f172a] p-4 flex flex-col animate-in slide-in-from-bottom-full duration-400">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">{inlineMode} Mode</h3>
                                            <button onClick={() => setIsInlineCompose(false)} className="text-xs font-black text-slate-400">CLOSE</button>
                                        </div>
                                        <div className="flex-1 space-y-6">
                                            {sendSuccess && <div className="text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-xl">{sendSuccess}</div>}
                                            {inlineMode === 'forward' && (
                                                <input type="text" placeholder="RECIPIENT EMAIL" value={sendTo} onChange={(e) => setSendTo(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-600" />
                                            )}
                                            <textarea autoFocus value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} placeholder="Type your message..." className="w-full flex-1 bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-6 text-[16px] font-medium focus:ring-2 focus:ring-blue-600 no-scrollbar min-h-[400px]" />
                                            <button onClick={handleSendEmail} disabled={sending} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2">
                                                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {sending ? 'SENDING' : 'SEND'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* List Items - Linear & Clean */}
                        {!selectedMail && (
                            <div className="divide-y divide-slate-100 dark:divide-white/5 animate-in fade-in duration-500">
                                {(() => {
                                    const mails =
                                        activeTab === 'inbox' ? inboxMails :
                                            activeTab === 'sent' ? sentMails :
                                                activeTab === 'archived' ? archivedMails : trashMails;

                                    if (loadingMails && mails.length === 0) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-50 dark:bg-white/5 rounded-xl animate-pulse" />)}</div>;
                                    if (mails.length === 0) return <div className="py-32 text-center text-slate-400 font-black uppercase text-xs tracking-widest opacity-30">Archive is empty</div>;

                                    return mails.map(m => (
                                        <button 
                                            key={m.id} onClick={() => setSelectedMail(m)}
                                            className="w-full flex items-center p-4 gap-4 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                                                <span className="font-black text-slate-400">{ (activeTab === 'inbox' ? m.fromAddress : m.toAddress)[0].toUpperCase() }</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{activeTab === 'inbox' ? m.fromAddress : m.toAddress}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(m.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 truncate">{m.subject}</p>
                                                <p className="text-[11px] font-medium text-slate-400 dark:text-white/30 truncate mt-1">{m.bodyText}</p>
                                            </div>
                                        </button>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* Compose Form — Modern Integrated Design */}
                {activeTab === 'compose' && (
                    <div className="max-w-4xl mx-auto space-y-6 pt-2 animate-in slide-in-from-bottom-4 duration-500">
                        {sendSuccess && <div className="text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-xl flex items-center gap-2"><Check className="w-5 h-5" /> {sendSuccess}</div>}
                        
                        <div className="flex flex-col gap-4">
                            {/* To Recipient */}
                            <div className="group transition-all">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 rounded-2xl border border-transparent focus-within:border-blue-600/30 focus-within:bg-white dark:focus-within:bg-white/5 transition-all">
                                    <AtSign className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600" />
                                    <input 
                                        value={sendTo} 
                                        onChange={e => setSendTo(e.target.value)} 
                                        placeholder="Recipient Address" 
                                        className="flex-1 bg-transparent border-none p-0 text-sm font-black text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0" 
                                    />
                                </div>
                            </div>

                            {/* Subject Line */}
                            <div className="group transition-all">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 rounded-2xl border border-transparent focus-within:border-blue-600/30 focus-within:bg-white dark:focus-within:bg-white/5 transition-all">
                                    <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600" />
                                    <input 
                                        value={sendSubject} 
                                        onChange={e => setSendSubject(e.target.value)} 
                                        placeholder="Subject Line" 
                                        className="flex-1 bg-transparent border-none p-0 text-sm font-black text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0" 
                                    />
                                </div>
                            </div>

                            {/* Message Body */}
                            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-3xl p-4 min-h-[300px] flex flex-col border border-transparent focus-within:border-blue-600/30 focus-within:bg-white dark:focus-within:bg-white/5 transition-all">
                                <textarea 
                                    value={sendMessage} 
                                    onChange={e => setSendMessage(e.target.value)} 
                                    placeholder="Write your message here..." 
                                    className="flex-1 bg-transparent border-none p-0 text-[16px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 resize-none leading-relaxed no-scrollbar" 
                                />
                            </div>
                        </div>

                        {/* Bottom Send Area */}
                        <div className="pt-2 pb-20">
                            <button 
                                onClick={handleSendEmail} 
                                disabled={sending} 
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-95"
                            >
                                {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {sending ? 'Sending...' : 'Send Message'}
                            </button>
                        </div>
                    </div>
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
        if (e) e.preventDefault();
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
                <div className="max-w-6xl mx-auto pb-20 pt-4 px-2 sm:px-4">
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
            <div className="max-w-3xl mx-auto pb-20 px-4">
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
