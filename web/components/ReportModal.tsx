'use client';

import { useState } from 'react';
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
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

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
            // Could add toast error here
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#1e293b] border border-[#334155] rounded-3xl p-8 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
                    <p className="text-[#94a3b8]">Thank you for helping keep our community safe. We will review this report shortly.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] border border-[#334155] rounded-3xl w-full max-w-md flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#334155]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Report Content</h2>
                            <p className="text-xs text-[#94a3b8]">Reporting {targetName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#334155] rounded-full transition-colors text-[#94a3b8] hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">Why are you reporting this?</label>
                        <div className="space-y-2">
                            {reasons.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${reason === r
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-[#0f172a] border-[#334155] text-[#cbd5e1] hover:border-[#475569]'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">Additional Details (Optional)</label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Please provide any additional context..."
                            className="w-full bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-white placeholder-[#64748b] focus:outline-none focus:border-blue-500 min-h-[100px] resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#334155] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-semibold text-[#94a3b8] hover:text-white hover:bg-[#334155] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!reason || loading}
                        className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Submit Report
                    </button>
                </div>
            </div>
        </div>
    );
}
