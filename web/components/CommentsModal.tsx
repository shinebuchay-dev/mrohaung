'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Heart, Reply } from 'lucide-react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { fixUrl } from '@/lib/utils';

interface CommentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    onCommentAdded?: () => void;
}

export default function CommentsModal({ isOpen, onClose, post, onCommentAdded }: CommentsModalProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchComments();
        }
    }, [isOpen]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/posts/${post.id}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        setSubmitting(true);
        try {
            const response = await api.post(`/posts/${post.id}/comment`, { content: commentText });
            setComments(prev => [...prev, response.data]);
            setCommentText('');
            if (onCommentAdded) onCommentAdded();
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (date: string) => {
        const now = new Date();
        const commentDate = new Date(date);
        const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return commentDate.toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Comments</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all duration-200 group"
                    >
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </button>
                </div>

                {/* Post Preview */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex-shrink-0 overflow-hidden ring-2 ring-blue-500/20">
                            {post.author.avatarUrl ? (
                                <img src={fixUrl(post.author.avatarUrl)} alt={post.author?.displayName || post.author?.username || ''} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">{(post.author?.displayName || post.author?.username)?.[0]?.toUpperCase() || 'U'}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-base leading-tight">{post.author?.displayName || post.author?.username || 'User'}</p>
                            {post.content && (
                                <p className="text-slate-600 dark:text-slate-300 text-sm mt-1.5 leading-relaxed">{post.content}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        </div>
                    ) : comments.length > 0 ? (
                        <div className="space-y-3">
                            <AnimatePresence>
                                {comments.map((comment, index) => (
                                    <motion.div
                                        key={comment.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500/30 transition-all duration-200">
                                                {comment.user?.avatarUrl ? (
                                                    <img src={fixUrl(comment.user.avatarUrl)} alt={comment.user?.displayName || comment.user?.username || ''} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold">
                                                            {(comment.user?.displayName || comment.user?.username)?.[0]?.toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-100 dark:border-white/5 group-hover:border-slate-200 dark:group-hover:border-white/10 transition-all duration-200">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{comment.user?.displayName || comment.user?.username || 'Unknown'}</p>
                                                        <span className="text-xs text-slate-400">•</span>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatTime(comment.createdAt)}</p>
                                                    </div>
                                                    <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{comment.content}</p>
                                                </div>
                                                {/* Comment Actions */}
                                                <div className="flex items-center gap-4 mt-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-500 font-medium transition-colors">
                                                        <Heart className="w-3.5 h-3.5" />
                                                        <span>Like</span>
                                                    </button>
                                                    <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-500 font-medium transition-colors">
                                                        <Reply className="w-3.5 h-3.5" />
                                                        <span>Reply</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Send className="w-10 h-10 text-slate-400" />
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">No comments yet</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">Be the first to share your thoughts!</p>
                        </div>
                    )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSubmit} className="px-6 py-5 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full px-5 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-200"
                            disabled={submitting}
                        />
                        <button
                            type="submit"
                            disabled={submitting || !commentText.trim()}
                            className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-bold transition-all duration-200 flex items-center gap-2 shadow-sm"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5 text-white" />
                                    <span className="text-white">Post</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
