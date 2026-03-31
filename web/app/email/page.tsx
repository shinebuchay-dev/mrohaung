'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, Copy, CheckCheck, Clock, XCircle, AtSign, Send, Inbox, UploadCloud, RefreshCw, Trash, Trash2, ArrowRight } from 'lucide-react';
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
        <div className="flex flex-col min-h-[580px]">
            {/* Account Header — seamless, no card */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">MROHAUNG Email</p>
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
            <div className="flex gap-4 border-b border-slate-100 dark:border-white/5 mb-4 px-1 overflow-x-auto no-scrollbar">
                {[
                    { id: 'inbox', icon: Inbox, label: 'Inbox', count: inboxMails.length },
                    { id: 'sent', icon: UploadCloud, label: 'Sent', count: sentMails.length },
                    { id: 'archived', icon: CheckCheck, label: 'Archived', count: archivedMails.length },
                    { id: 'trash', icon: XCircle, label: 'Trash', count: trashMails.length },
                    { id: 'compose', icon: Send, label: 'Compose' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 pb-3 text-sm font-bold transition-all border-b-2 -mb-px whitespace-nowrap ${activeTab === tab.id
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

            {/* Content Area — Dynamic Layout */}
            <div className="flex-1">
                {['inbox', 'sent', 'archived', 'trash'].includes(activeTab) && (
                    <div className={`grid gap-6 ${selectedMail ? 'lg:grid-cols-5' : 'grid-cols-1'}`}>
                        {/* Left Column: Mail List */}
                        <div className={`${selectedMail ? 'lg:col-span-2 hidden lg:block' : ''} space-y-1`}>
                            {(() => {
                                const mails =
                                    activeTab === 'inbox' ? inboxMails :
                                        activeTab === 'sent' ? sentMails :
                                            activeTab === 'archived' ? archivedMails : trashMails;

                                const emptyMsg =
                                    activeTab === 'inbox' ? 'Your inbox is empty.' :
                                        activeTab === 'sent' ? 'No sent emails yet.' :
                                            activeTab === 'archived' ? 'No archived emails.' : 'Trash is empty.';

                                if (loadingMails && mails.length === 0) return (
                                    <div className="flex items-center gap-2 py-8 text-slate-400 text-sm px-1">
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
                                            <div 
                                                key={m.id} 
                                                onClick={() => setSelectedMail(m)}
                                                className={`py-2 px-3 rounded-xl transition-all cursor-pointer mb-1 border-l-4 group ${
                                                    selectedMail?.id === m.id
                                                    ? 'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-500 shadow-sm'
                                                    : 'hover:bg-slate-50 dark:hover:bg-white/5 border-transparent'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Title & Subject grouped closely */}
                                                        <p className={`font-bold text-[13px] truncate leading-tight ${selectedMail?.id === m.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>
                                                            {activeTab === 'inbox' ? m.fromAddress : m.toAddress}
                                                        </p>
                                                        <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 truncate leading-tight mt-0.5">
                                                            {m.subject}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0 ml-2">
                                                        <p className="text-[9px] text-slate-400 font-bold mb-1">{new Date(m.createdAt).toLocaleDateString()}</p>
                                                        {/* Quick actions under date */}
                                                        <div className="flex gap-1.5 mt-0.5">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleEmailAction(m.id, 'archive'); }}
                                                                className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded"
                                                            >
                                                                <CheckCheck className="w-2.5 h-2.5 text-slate-400 hover:text-indigo-500" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleEmailAction(m.id, 'trash'); }}
                                                                className="p-1 hover:bg-red-100 dark:hover:bg-red-500/10 rounded"
                                                            >
                                                                <Trash2 className="w-2.5 h-2.5 text-slate-400 hover:text-red-500" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate mt-1">{m.bodyText}</p>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Right Column: Mail Detail */}
                        {selectedMail && (
                            <div className="lg:col-span-3 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 p-6 shadow-2xl shadow-indigo-500/5 flex flex-col h-[520px] animate-in slide-in-from-right-4 duration-300 overflow-hidden">
                                {/* Header: Date on left, Icons on far right */}
                                <div className="flex items-center justify-between mb-1 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setSelectedMail(null)}
                                            className="lg:hidden flex items-center gap-1 text-xs font-bold text-indigo-500"
                                        >
                                            <Mail className="w-3 h-3 rotate-180" /> Back
                                        </button>
                                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded">
                                            {new Date(selectedMail.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button 
                                            onClick={() => handleEmailAction(selectedMail.id, 'archive')}
                                            className="p-1 hover:bg-indigo-500/10 rounded transition-colors group"
                                            title="Archive"
                                        >
                                            <CheckCheck className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                                        </button>
                                        <button 
                                            onClick={() => handleEmailAction(selectedMail.id, 'trash')}
                                            className="p-1 hover:bg-red-500/10 rounded transition-colors group"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Message Content */}
                                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                                    <div className="space-y-2">
                                        <div>
                                            <h1 className="text-xl font-black text-slate-900 dark:text-white mb-1 leading-tight">
                                                {selectedMail.subject}
                                            </h1>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider w-8">From</p>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedMail.fromAddress}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider w-8">To</p>
                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{selectedMail.toAddress}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-50 dark:bg-white/5" />

                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                            {selectedMail.bodyText}
                                        </div>
                                    </div>
                                </div>

                                {/* Action row — Pinned at bottom */}
                                <div className="pt-4 flex gap-3 mt-auto shrink-0 border-t border-slate-50 dark:border-white/5 bg-white/50 dark:bg-slate-900/10 -mx-6 px-6 pb-2">
                                    {activeTab !== 'trash' && !isInlineCompose && (
                                        <>
                                            <button 
                                                onClick={() => handleStartInline('reply')}
                                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                            >
                                                <Send className="w-3.5 h-3.5" /> Reply
                                            </button>
                                            <button 
                                                onClick={() => handleStartInline('forward')}
                                                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                                            >
                                                <ArrowRight className="w-3.5 h-3.5" /> Forward
                                            </button>
                                        </>
                                    )}
                                    {activeTab === 'trash' && (
                                        <>
                                            <button onClick={() => handleEmailAction(selectedMail.id, 'restore')} className="px-5 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg">Restore Email</button>
                                            <button 
                                                onClick={() => {
                                                    if(confirm('Permanently delete this email?')) handleEmailAction(selectedMail.id, 'delete');
                                                }}
                                                className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Inline Compose Form */}
                                {isInlineCompose && (
                                    <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-500/20 animate-in slide-in-from-bottom-4 duration-300">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2">
                                                {inlineMode === 'reply' ? <Send className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                                                {inlineMode === 'reply' ? 'Inline Reply' : 'Inline Forward'}
                                            </p>
                                            <button onClick={() => setIsInlineCompose(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase">Cancel</button>
                                        </div>
                                        <div className="space-y-3">
                                            {sendSuccess && (
                                                <div className="text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 p-2 text-[11px] font-bold rounded-lg flex items-center gap-1.5"><Check className="w-3.5 h-3.5"/> {sendSuccess}</div>
                                            )}
                                            {sendError && (
                                                <div className="text-red-500 bg-red-50 dark:bg-red-500/10 p-2 text-[11px] font-bold rounded-lg flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5"/> {sendError}</div>
                                            )}
                                            {inlineMode === 'forward' && (
                                                <input 
                                                    type="text" 
                                                    placeholder="To: (recipient email)"
                                                    value={sendTo}
                                                    onChange={(e) => setSendTo(e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-lg px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-indigo-500"
                                                />
                                            )}
                                            <textarea 
                                                autoFocus
                                                value={sendMessage}
                                                onChange={(e) => setSendMessage(e.target.value)}
                                                placeholder="Write your message..."
                                                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-xs min-h-[120px] focus:ring-1 focus:ring-indigo-500 no-scrollbar"
                                            />
                                            <div className="flex justify-end pt-1">
                                                <button 
                                                    onClick={handleSendEmail}
                                                    disabled={sending}
                                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-white/10 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                                >
                                                    {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                    {sending ? 'Sending...' : 'Send Message'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Compose — clean form, no card background */}
                {activeTab === 'compose' && (
                    <div className="max-w-2xl">
                        <form onSubmit={handleSendEmail} className="space-y-4 pt-2">
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
                                    rows={8}
                                    className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
                                />
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit" disabled={sending}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    {sending ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Message</>}
                                </button>
                            </div>
                        </form>
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
                <div className="max-w-6xl mx-auto pb-20 pt-4 px-4">
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
