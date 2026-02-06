'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Send } from 'lucide-react';
import api from '@/lib/api';

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    onUpdate: () => void;
}

// ၂၀ ကြောင်းအထိ auto-adjust (Create Post နဲ့အတူ)
const EDIT_TEXTAREA_LINE_HEIGHT = 24;
const EDIT_TEXTAREA_MAX_LINES = 20;
const EDIT_TEXTAREA_MAX_HEIGHT = EDIT_TEXTAREA_LINE_HEIGHT * EDIT_TEXTAREA_MAX_LINES;
const EDIT_TEXTAREA_MIN_HEIGHT = 40;

export default function EditPostModal({ isOpen, onClose, post, onUpdate }: EditPostModalProps) {
    const [content, setContent] = useState(post?.content || '');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustTextareaHeight = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const height = Math.min(Math.max(el.scrollHeight, EDIT_TEXTAREA_MIN_HEIGHT), EDIT_TEXTAREA_MAX_HEIGHT);
        el.style.height = `${height}px`;
        el.style.overflowY = height >= EDIT_TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    };

    useEffect(() => {
        if (isOpen) adjustTextareaHeight();
    }, [isOpen, content]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.put(`/posts/${post.id}`, { content });
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to update post:', error);
            alert('Failed to update post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155]/60 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]/40 bg-white/5 relative">
                    <div className="flex items-center gap-3 pr-10">
                        <div className="w-1.5 h-6 bg-gradient-to-t from-blue-600 to-purple-600 rounded-full" />
                        <h2 className="text-lg font-bold text-white tracking-tight">Edit Post</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[#334155]/50 hover:bg-[#475569]/70 rounded-full transition-all duration-200 text-[#94a3b8] hover:text-white z-20 backdrop-blur-sm"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-2">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Edit your post..."
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-white placeholder-[#64748b] resize-none py-1 text-[16px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            style={{ minHeight: EDIT_TEXTAREA_MIN_HEIGHT, maxHeight: EDIT_TEXTAREA_MAX_HEIGHT }}
                            rows={1}
                            maxLength={65000}
                            autoFocus
                        />

                        {/* Current Image Preview */}
                        {post.imageUrl && (
                            <div className="relative rounded-2xl overflow-hidden border border-[#334155]/50 group">
                                <img
                                    src={post.imageUrl}
                                    alt="Post"
                                    className="w-full h-auto max-h-80 object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-[11px] font-medium text-white/70 border border-white/10 uppercase tracking-wider">
                                    Fixed Attachment
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end border-t border-[#334155]/40 pt-4">
                            <span className="text-[11px] font-medium text-[#64748b] uppercase tracking-widest">{content.length}/500 characters</span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-2.5 bg-[#334155]/50 hover:bg-[#475569]/50 text-white font-semibold rounded-xl border border-[#334155]/50 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !content.trim()}
                            className="flex-[2] px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Save Changes</span>
                                    <Send className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
