'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Check, ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { fixUrl } from '@/lib/utils';

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    onUpdate: () => void;
}

const EDIT_TEXTAREA_MAX_HEIGHT = 480;
const EDIT_TEXTAREA_MIN_HEIGHT = 80;

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
        if (isOpen) {
            setContent(post?.content || '');
            setTimeout(adjustTextareaHeight, 50);
        }
    }, [isOpen, post]);

    useEffect(() => {
        adjustTextareaHeight();
    }, [content]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        try {
            await api.put(`/posts/${post.id}`, { content });
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to update post:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/5">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">Edit Post</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="px-5 py-4">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Edit your post..."
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-white placeholder-slate-400 resize-none text-[15px] leading-relaxed"
                            style={{ minHeight: EDIT_TEXTAREA_MIN_HEIGHT, maxHeight: EDIT_TEXTAREA_MAX_HEIGHT }}
                            rows={1}
                            maxLength={65000}
                            autoFocus
                        />

                        {/* Image preview if exists */}
                        {post.imageUrl && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 dark:border-white/5">
                                <img
                                    src={fixUrl(post.imageUrl)}
                                    alt="Post"
                                    className="w-full h-auto max-h-60 object-cover"
                                />
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 px-3 py-1.5 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Image cannot be changed
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-white/5">
                        <p className="text-[11px] text-slate-400 flex-1">{content.length} characters</p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !content.trim()}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
