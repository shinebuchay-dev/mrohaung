'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Clock, Check, Smile, ThumbsUp, Laugh, Frown, Angry, Star, Flag } from 'lucide-react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import VoiceRecorder from './VoiceRecorder';
import { useSocket } from '@/lib/socket';
import StickerPicker from './StickerPicker';
import ReactionPicker from './ReactionPicker';
import { fixUrl } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    onUpdate?: (post: any) => void;
    onDelete?: (id?: string) => void;
    currentUserId?: string;
    initialCommentId?: string | null;
}

// Edit textarea settings
const EDIT_TEXTAREA_LINE_HEIGHT = 24;
const EDIT_TEXTAREA_MAX_LINES = 20;
const EDIT_TEXTAREA_MAX_HEIGHT = EDIT_TEXTAREA_LINE_HEIGHT * EDIT_TEXTAREA_MAX_LINES;
const EDIT_TEXTAREA_MIN_HEIGHT = 40;

const formatTimeRelative = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return commentDate.toLocaleDateString();
};



// CommentItem removed - using CommentSection component
import CommentSection from './CommentSection';

export default function PostModal({ isOpen, onClose, post, onUpdate, onDelete, currentUserId, initialCommentId }: PostModalProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [liked, setLiked] = useState(!!post.isLiked);
    const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content || '');
    const [saving, setSaving] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [reactionType, setReactionType] = useState<string | null>(post.userReaction || (post.isLiked ? 'like' : null));
    const [showReactions, setShowReactions] = useState(false);

    // Voice & Sticker State
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [showStickers, setShowStickers] = useState(false);
    const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
    const { user: currentUser } = useAuth();


    const { socket } = useSocket();

    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustEditTextareaHeight = () => {
        const el = editTextareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const height = Math.min(Math.max(el.scrollHeight, EDIT_TEXTAREA_MIN_HEIGHT), EDIT_TEXTAREA_MAX_HEIGHT);
        el.style.height = `${height}px`;
        el.style.overflowY = height >= EDIT_TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    };

    useEffect(() => {
        if (isOpen && isEditing) adjustEditTextareaHeight();
    }, [isOpen, isEditing, editContent]);

    const isOwnPost = currentUserId === post.author.id;

    // Track original URL for restoring
    const originalUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (isOpen && post && post.id) {
            const currentParams = new URLSearchParams(window.location.search);
            const originalPath = window.location.pathname;
            
            // Only push if it's not already there
            if (currentParams.get('post') !== post.id) {
                currentParams.set('post', post.id);
                const newUrl = `${originalPath}?${currentParams.toString()}`;
                window.history.pushState({ postModal: true, postId: post.id }, '', newUrl);
            }

            const handlePopState = (event: PopStateEvent) => {
                // If we hit the back button and the state doesn't have the post, close modal
                if (isOpen && (!event.state || event.state.postId !== post.id)) {
                    onClose();
                }
            };

            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
                
                // When closing, remove the 'post' param if it's still there
                const finalParams = new URLSearchParams(window.location.search);
                if (finalParams.get('post') === post.id) {
                    finalParams.delete('post');
                    const search = finalParams.toString();
                    const restoredUrl = `${originalPath}${search ? '?' + search : ''}`;
                    window.history.replaceState(null, '', restoredUrl);
                }
            };
        }
    }, [isOpen, post.id, onClose]);

    useEffect(() => {
        setReactionType(post.userReaction || (post.isLiked ? 'like' : null));
    }, [post.userReaction, post.isLiked]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            fetchComments();
            setEditContent(post.content || '');
            
            // currentUser comes from AuthContext, no need to fetch
            // Reset Comment State
            setCommentText('');
            setAudioBlob(null);
            setSelectedSticker(null);
            setShowStickers(false);
            setShowStickers(false);

            if (socket) {
                socket.emit('join_post', post.id);

                socket.on('new_comment', (newComment: any) => {
                    if (newComment.postId === post.id) {
                        setComments(prev => {
                            if (prev.find(c => c.id === newComment.id)) return prev;
                            return [...prev, newComment];
                        });
                    }
                });

                socket.on('comment_deleted', ({ commentId }: { commentId: string }) => {
                    setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
                });

                socket.on('comment_updated', ({ commentId, content }: { commentId: string, content: string }) => {
                    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content } : c));
                });

                return () => {
                    socket.emit('leave_post', post.id);
                    socket.off('new_comment');
                    socket.off('comment_deleted');
                    socket.off('comment_updated');
                };
            }
        }
    }, [isOpen, post.id, socket]);

    // Scroll to initial comment
    useEffect(() => {
        if (isOpen && initialCommentId && comments.length > 0) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`comment-${initialCommentId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight effect
                    element.classList.add('bg-blue-500/10', 'dark:bg-blue-400/10');
                    setTimeout(() => {
                        element.classList.remove('bg-blue-500/10', 'dark:bg-blue-400/10');
                    }, 2500);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialCommentId, comments]);





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

    // Update liked state if post prop changes and we are reopening
    useEffect(() => {
        if (isOpen) {
            setLiked(!!post.isLiked);
            setLikeCount(post._count?.likes || 0);
        }
    }, [isOpen, post]);

    const getReactionStyle = (type: string | null) => {
        const t = type?.toLowerCase();
        switch (t) {
            case 'love': return { icon: <Heart className="w-4 h-4 text-red-500 fill-red-500" />, label: 'Love', color: 'text-red-500' };
            case 'haha': return { icon: <Laugh className="w-4 h-4 text-yellow-500 fill-yellow-500" />, label: 'Haha', color: 'text-yellow-500' };
            case 'wow': return { icon: <Star className="w-4 h-4 text-purple-500 fill-purple-500" />, label: 'Wow', color: 'text-purple-500' };
            case 'sad': return { icon: <Frown className="w-4 h-4 text-blue-400 fill-blue-400" />, label: 'Sad', color: 'text-blue-400' };
            case 'angry': return { icon: <Angry className="w-4 h-4 text-orange-500 fill-orange-500" />, label: 'Angry', color: 'text-orange-500' };
            case 'like': return { icon: <ThumbsUp className="w-4 h-4 text-blue-500 fill-blue-500" />, label: 'Like', color: 'text-blue-500' };
            default: return { icon: <ThumbsUp className="w-4 h-4 text-slate-500 dark:text-[#64748b]" />, label: 'Like', color: 'text-slate-500 dark:text-[#64748b]' };
        }
    };

    const handleReaction = async (type: string) => {
        const previousType = reactionType;
        if (reactionType === type) {
            setReactionType(null);
            setLikeCount((prev: number) => Math.max(0, prev - 1));
        } else {
            setReactionType(type);
            if (!previousType) setLikeCount((prev: number) => prev + 1);
        }
        setShowReactions(false);
        try {
            await api.post(`/posts/${post.id}/like`, { type });
        } catch (error) {
            console.error('Failed to react:', error);
        }
    };



    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (!commentText.trim() && !audioBlob && !selectedSticker) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            if (commentText.trim()) formData.append('content', commentText);
            if (audioBlob) formData.append('audio', audioBlob, 'voice-comment.webm');
            if (selectedSticker) formData.append('stickerUrl', selectedSticker);

            const response = await api.post(`/posts/${post.id}/comment`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setComments(prev => {
                const exists = prev.find(c => c.id === response.data.id);
                if (exists) return prev;
                return [...prev, response.data];
            });

            // Reset fields
            setCommentText('');
            setAudioBlob(null);
            setSelectedSticker(null);
            setShowStickers(false);
            setShowStickers(false);

            // Reset textarea height to original
            if (commentTextareaRef.current) {
                commentTextareaRef.current.style.height = '24px';
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setSubmitting(false);
        }
    };



    const handleSaveEdit = async () => {
        if (!editContent.trim()) return;
        setSaving(true);
        try {
            await api.put(`/posts/${post.id}`, { content: editContent });
            post.content = editContent;
            setIsEditing(false);
            if (onUpdate) onUpdate(post);
        } catch (error) {
            console.error('Failed to update post:', error);
            alert('Failed to update post');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            await api.delete(`/posts/${post.id}`);
            if (onDelete) onDelete(post.id);
            onClose();
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('Failed to delete post');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Post details"
                className="bg-white dark:bg-[#0b1120] sm:rounded-2xl rounded-none w-full max-w-lg h-full sm:h-auto sm:max-h-[80vh] flex flex-col overflow-hidden shadow-xl"
            >
                {/* Mobile Sticky Header */}
                <div className="sm:hidden sticky top-0 z-[50] bg-white dark:bg-[#0b1120] px-4 h-[44px] flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                    <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Post</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {/* Post Header (Author Info) - Sticky */}
                    <div className="sticky top-0 z-[40] bg-white dark:bg-[#0b1120] px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <Link href={`/profile/${post.author.username}`} className="relative flex-shrink-0 group" onClick={onClose}>
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#334155] bg-cover bg-center ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-300" style={{ backgroundImage: post.author.avatarUrl ? `url(${fixUrl(post.author.avatarUrl)})` : undefined }} />
                                <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#1e293b]" />
                            </Link>
                            <div className="flex flex-col justify-center">
                                <Link href={`/profile/${post.author.username}`} className="text-slate-900 dark:text-white font-bold text-[15px] hover:underline decoration-blue-500/50 underline-offset-2 leading-tight" onClick={onClose}>
                                    {post.author.displayName || post.author.username}
                                </Link>
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-[#64748b] mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    <p>{formatTimeRelative(post.createdAt)}</p>
                                    <span className="w-1 h-1 rounded-full bg-[#334155]" />
                                    <span className="text-blue-500/80">Public</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Menu Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${showMenu ? 'bg-slate-200 dark:bg-[#334155] text-slate-900 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-[#334155]/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                                <AnimatePresence>
                                    {showMenu && (
                                        <>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#0b1120] backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-[110]"
                                            >
                                                <div className="py-1">
                                                    {isOwnPost ? (
                                                        <>
                                                            <button
                                                                onClick={() => { setShowMenu(false); setIsEditing(true); }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors text-sm font-bold group"
                                                            >
                                                                <Edit2 className="w-4 h-4 text-blue-400" />
                                                                Edit Post
                                                            </button>
                                                            <button
                                                                onClick={() => { setShowMenu(false); handleDelete(); }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-red-500 transition-colors text-sm font-medium group"
                                                            >
                                                                <div className="w-4 h-4 flex items-center justify-center">
                                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                                </div>
                                                                Delete Post
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-yellow-500/10 text-yellow-500 transition-colors text-sm font-medium group">
                                                            <Flag className="w-4 h-4" />
                                                            Report Post
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                            <div className="fixed inset-0 z-[105]" onClick={() => setShowMenu(false)} />
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Desktop Close Button */}
                            <button
                                onClick={onClose}
                                className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Post Body & Details */}
                    <div className="px-4 pt-3 pb-0">
                        {/* Body */}
                        <div className={isEditing ? "mb-1" : "mb-3"}>
                            {isEditing ? (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <textarea ref={editTextareaRef} value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none py-1 text-[15px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ minHeight: EDIT_TEXTAREA_MIN_HEIGHT, maxHeight: EDIT_TEXTAREA_MAX_HEIGHT }} rows={1} placeholder="Edit your post..." autoFocus maxLength={65000} />
                                </div>
                            ) : (
                                <>{post.content && <p className="text-slate-800 dark:text-slate-100 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>}</>
                            )}
                        </div>
                        {post.imageUrl && <div className="rounded-lg overflow-hidden bg-black mb-3 border border-slate-200 dark:border-[#334155]/50"><img src={fixUrl(post.imageUrl)} alt="Post" className="w-full h-auto max-h-[400px] object-contain mx-auto" /></div>}

                        {isEditing && (
                            <div className="flex justify-center gap-3 py-4 border-t border-slate-200 dark:border-[#334155]/40 mt-2">
                                <button onClick={() => { setIsEditing(false); setEditContent(post.content || ''); }} className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl min-w-[120px]">Cancel</button>
                                <button onClick={handleSaveEdit} disabled={saving || !editContent.trim()} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-bold text-white rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 min-w-[160px]">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> <span>Save Changes</span></>}</button>
                            </div>
                        )}
                        {!isEditing && (
                            <div className="px-4 h-[50px] flex items-center justify-between border-t border-slate-200 dark:border-[#334155]/30">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="relative"
                                        onMouseEnter={() => setShowReactions(true)}
                                        onMouseLeave={() => setShowReactions(false)}
                                    >
                                        <AnimatePresence>
                                            {showReactions && (
                                                <ReactionPicker
                                                    onSelect={handleReaction}
                                                    onClose={() => setShowReactions(false)}
                                                />
                                            )}
                                        </AnimatePresence>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleReaction(reactionType || 'like')}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-colors group/like ${getReactionStyle(reactionType).color} hover:bg-slate-50 dark:hover:bg-slate-800/50 relative z-10 translate-y-[1px]`}
                                        >
                                            <div className={`p-0.5 rounded-full transition-colors ${reactionType ? '' : 'group-hover/like:bg-red-50 dark:group-hover/like:bg-red-500/10'}`}>
                                                {getReactionStyle(reactionType).icon}
                                            </div>
                                            <span className={`text-[13px] font-medium ${reactionType ? '' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {reactionType ? getReactionStyle(reactionType).label : 'Like'}
                                            </span>
                                            {likeCount > 0 && (
                                                <span className="text-[13px] font-medium opacity-60 ml-0.5">{likeCount}</span>
                                            )}
                                        </motion.button>
                                    </div>
                                    <div className="flex items-center gap-1.5 group/comment translate-y-[1px]">
                                        <div className="p-2 rounded-full group-hover/comment:bg-blue-500/10 transition-colors"><MessageCircle className="w-4 h-4 text-slate-500 dark:text-[#64748b] group-hover/comment:text-blue-500 transition-colors" /></div>
                                        <span className="text-xs font-bold text-slate-500 dark:text-[#64748b] group-hover/comment:text-blue-500 transition-colors">{comments.length}</span>
                                    </div>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        const url = `${window.location.origin}/profile/${post.author.username}/${post.id}`;
                                        if (navigator.share) {
                                            navigator.share({
                                                title: `Post by ${post.author.displayName || post.author.username}`,
                                                text: post.content,
                                                url: url
                                            }).catch(console.error);
                                        } else {
                                            navigator.clipboard.writeText(url);
                                            alert('Link copied to clipboard!');
                                        }
                                    }}
                                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-500 dark:text-[#64748b] hover:text-white group/share translate-y-[1px]"
                                >
                                    <Share2 className="w-4 h-4" />
                                </motion.button>
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="border-t border-slate-100 dark:border-white/5 px-4 py-2">
                        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <div className="p-4">
                                <CommentSection
                                    comments={comments}
                                    currentUserId={currentUserId}
                                    postId={post.id}
                                    onDelete={(id) => setComments(prev => prev.filter(c => c.id !== id))}
                                    onUpdate={(id, content) => setComments(prev => prev.map(c => c.id === id ? { ...c, content } : c))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Input (Sticky) */}
                <div className="flex-none px-4 py-3 bg-white dark:bg-[#0b1120] border-t border-slate-100 dark:border-white/5 z-10 w-full">
                    {currentUserId ? (
                        <form onSubmit={handleSubmitComment} className="flex gap-2 items-end w-full max-w-4xl mx-auto">
                            {/* Left: Input Area */}
                            <div className="flex-1 bg-slate-100/50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-2xl px-3.5 py-2.5 min-h-[46px] flex items-center border border-slate-200 dark:border-white/5 focus-within:border-blue-500/30 focus-within:bg-white dark:focus-within:bg-white/[0.08] transition-all duration-300">
                                {selectedSticker ? (
                                    <div className="flex items-center gap-2 bg-white dark:bg-[#0b1120] px-3 py-1 rounded-xl border border-slate-200 dark:border-[#334155] w-fit animate-in fade-in zoom-in-95">
                                        <img src={fixUrl(selectedSticker)} alt="Selected" className="w-8 h-8 object-contain" />
                                        <button type="button" onClick={() => setSelectedSticker(null)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-500"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : audioBlob ? (
                                    <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 w-fit animate-in fade-in slide-in-from-left-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                        <span className="text-[11px] text-blue-500 font-bold uppercase tracking-wider">Voice Ready</span>
                                        <button type="button" onClick={() => setAudioBlob(null)} className="p-1 hover:bg-blue-500/10 rounded-full text-blue-500"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : (
                                    <textarea
                                        ref={commentTextareaRef}
                                        value={commentText}
                                        onChange={(e) => {
                                            setCommentText(e.target.value);
                                            const el = commentTextareaRef.current;
                                            if (el) {
                                                el.style.height = '24px';
                                                const newHeight = Math.min(el.scrollHeight, 120);
                                                el.style.height = (newHeight > 24 ? newHeight : 24) + 'px';
                                                el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSubmitComment(e);
                                            }
                                        }}
                                        placeholder="Write a comment..."
                                        rows={1}
                                        className="w-full bg-transparent border-none outline-none text-[15px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none overflow-hidden min-h-[24px] py-0 break-words whitespace-pre-wrap"
                                        style={{ height: 'auto' }}
                                        maxLength={10000}
                                    />
                                )}
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-0.5 shrink-0 pb-1">
                                {!audioBlob && !selectedSticker && (
                                    <>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowStickers(!showStickers)}
                                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 rounded-full transition-all"
                                            >
                                                <Smile className="w-5 h-5" />
                                            </button>
                                            <AnimatePresence>
                                                {showStickers && (
                                                    <div className="absolute bottom-full right-0 mb-4 z-50">
                                                        <StickerPicker
                                                            onSelect={(url) => setSelectedSticker(url)}
                                                            onClose={() => setShowStickers(false)}
                                                        />
                                                    </div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <VoiceRecorder onRecordingComplete={(blob) => setAudioBlob(blob)} onCancel={() => setAudioBlob(null)} />
                                    </>
                                )}
                                <button
                                    type="submit"
                                    disabled={submitting || (!commentText.trim() && !audioBlob && !selectedSticker)}
                                    className="p-2.5 text-blue-500 disabled:text-slate-300 dark:disabled:text-slate-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition-all active:scale-90 flex-shrink-0"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center justify-center py-3 px-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5">
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">Login to join the conversation</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

