'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId?: string;
    userId?: string;
    targetName: string; // The name of the user or "this post"
}

export default function ReportModal({ isOpen, onClose, postId, userId, targetName }: ReportModalProps) {
    const [mounted, setMounted] = useState(false);
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const reasons = [
        "Inappropriate Content",
        "Harassment / Hate Hate Speech",
        "Spam / Scams",
        "Misinformation",
        "Violating Terms of Service",
        "Other"
    ];

    const handleSubmit = async () => {
        if (!reason) return;

        setLoading(true);
        try {
            await api.post('/reports', {
                reason,
                details,
                postId,
                targetUserId: userId
            });
            setSubmitted(true);
            setTimeout(() => {
                onClose();
                setSubmitted(false);
                setReason('');
                setDetails('');
            }, 2000);
        } catch (error) {
            console.error('Failed to submit report:', error);
        } finally {
            setLoading(false);
        }
    };

    const modalContent = submitted ? (
        <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Report Received</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">We've received your feedback. Our safety team will review this content shortly to maintain a positive community.</p>
            </div>
        </div>
    ) : (
        <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
        >
            <div 
                className="bg-white dark:bg-[#0f172a] border border-slate-200/50 dark:border-white/5 rounded-[2.5rem] w-full max-w-md flex flex-col shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-8 pb-4">
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Safety Report</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Report Content</h2>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Concern about {targetName}</p>
                    </div>
                </div>

                {/* Body */}
                <div className="px-8 py-4 space-y-8 overflow-y-auto no-scrollbar max-h-[60vh]">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Select Reason</label>
                        <div className="grid grid-cols-1 gap-2">
                            {reasons.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`group relative w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${reason === r
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 translate-x-1'
                                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <span className={`text-xs font-bold transition-colors ${reason === r ? 'text-white' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>{r}</span>
                                    {reason === r && <ShieldCheck className="w-4 h-4 text-white/80" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Context (Optional)</label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Tell us why this content should be reviewed..."
                            className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500/50 min-h-[120px] resize-none transition-all"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!reason || loading}
                        className="flex-[1.5] h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-[11px] uppercase tracking-[0.15em] transition-all disabled:opacity-30 disabled:grayscale shadow-lg shadow-red-600/20 active:scale-95 flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
