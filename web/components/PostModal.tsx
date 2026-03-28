'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Clock, Check, Smile, ThumbsUp, Laugh, Frown, Angry, Star, Flag } from 'lucide-react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import VoiceRecorder from './VoiceRecorder';
import { useRouter } from 'next/navigation';
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
                {/* Unified Sticky Header */}
                <div className="sticky top-0 z-[100] flex items-center justify-between px-5 py-4 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-xl border-b border-slate-50 dark:border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href={`/profile/${post.author.username}`} className="relative flex-shrink-0" onClick={onClose}>
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 bg-cover bg-center" style={{ backgroundImage: post.author.avatarUrl ? `url(${fixUrl(post.author.avatarUrl)})` : undefined }}>
                                {!post.author.avatarUrl && <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">{(post.author.displayName || post.author.username)?.[0]?.toUpperCase()}</div>}
                            </div>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#0b1120]" />
                        </Link>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-[4px] flex-wrap">
                                <Link href={`/profile/${post.author.username}`} className="text-slate-900 dark:text-white font-black text-[14px] hover:underline underline-offset-2" onClick={onClose}>
                                    {post.author.displayName || post.author.username}
                                </Link>
                                {post.author.isVerified && (
                                    <div className="flex-shrink-0 flex items-center justify-center bg-amber-500 rounded-full w-[11px] h-[11px] mt-[1px]">
                                        <Check className="w-[6px] h-[6px] text-white" strokeWidth={6} />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                <p>{formatTimeRelative(post.createdAt)}</p>
                                <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                <span className="text-blue-500/80 uppercase tracking-widest text-[8px]">Public</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            <AnimatePresence>
                                {showMenu && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-[110] p-1.5"
                                        >
                                            {isOwnPost ? (
                                                <>
                                                    <button onClick={() => { setShowMenu(false); setIsEditing(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg transition-all">
                                                        <Edit2 className="w-4 h-4 text-slate-400" /> Edit Post
                                                    </button>
                                                    <button onClick={() => { setShowMenu(false); handleDelete(); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 text-sm font-bold rounded-lg transition-all">
                                                        <Trash2 className="w-4 h-4" /> Delete Post
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 text-yellow-600 text-sm font-bold rounded-lg transition-all">
                                                    <Flag className="w-4 h-4" /> Report Post
                                                </button>
                                            )}
                                        </motion.div>
                                        <div className="fixed inset-0 z-[105]" onClick={() => setShowMenu(false)} />
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pt-6">

                    {/* Post Body & Details */}
                    <div className="px-5 pb-4">
                        <div className="mb-4">
                            {isEditing ? (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                    <textarea 
                                        ref={editTextareaRef} 
                                        value={editContent} 
                                        onChange={(e) => {
                                            setEditContent(e.target.value);
                                            const el = editTextareaRef.current;
                                            if (el) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                            }
                                        }} 
                                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none text-[15px] leading-relaxed p-0 m-0 font-medium" 
                                        style={{ minHeight: '60px', maxHeight: '400px' }} 
                                        rows={1} 
                                        placeholder="What's on your mind?" 
                                        autoFocus 
                                    />
                                    <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-50 dark:border-white/5">
                                        <button 
                                            onClick={() => { setIsEditing(false); setEditContent(post.content || ''); }} 
                                            className="text-[11px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-[0.2em]"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSaveEdit} 
                                            disabled={saving || !editContent.trim()} 
                                            className="text-[11px] font-black text-blue-500 hover:text-blue-600 disabled:text-slate-200 dark:disabled:text-slate-800 transition-all uppercase tracking-[0.2em] flex items-center gap-2"
                                        >
                                            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                                            {saving ? 'Saving' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>{post.content && <p className="text-slate-800 dark:text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>}</>
                            )}
                        </div>

                        {post.imageUrl && (
                            <div className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 mb-4 max-h-[500px]">
                                <img src={fixUrl(post.imageUrl)} alt="Post" className="w-full h-full object-contain mx-auto" />
                            </div>
                        )}

                        {!isEditing && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="relative" onMouseEnter={() => setShowReactions(true)} onMouseLeave={() => setShowReactions(false)}>
                                        <AnimatePresence>{showReactions && <ReactionPicker onSelect={handleReaction} onClose={() => setShowReactions(false)} />}</AnimatePresence>
                                        <button 
                                            onClick={() => handleReaction(reactionType || 'like')}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${getReactionStyle(reactionType).color}`}
                                        >
                                            {getReactionStyle(reactionType).icon}
                                            <span className="text-[13px] font-black uppercase tracking-wider">{reactionType ? getReactionStyle(reactionType).label : 'Like'}</span>
                                            {likeCount > 0 && <span className="text-[13px] font-black opacity-40">{likeCount}</span>}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 dark:text-slate-500">
                                        <MessageCircle className="w-4 h-4" />
                                        <span className="text-[13px] font-black">{comments.length}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/profile/${post.author.username}/${post.id}`;
                                        if (navigator.share) {
                                            navigator.share({ title: `Post by ${post.author.displayName || post.author.username}`, text: post.content, url }).catch(console.error);
                                        } else {
                                            navigator.clipboard.writeText(url);
                                            alert('Link copied!');
                                        }
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="border-t border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                        <div className="px-5 py-6">
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

                {/* Footer Input (Sticky) */}
                <div className="px-5 py-4 bg-white dark:bg-[#0b1120] border-t border-slate-50 dark:border-white/5">
                    {currentUserId ? (
                        <form onSubmit={handleSubmitComment} className="flex gap-3 items-end">
                            <div className="flex-1 bg-slate-50 dark:bg-white/[0.03] rounded-2xl px-4 py-2.5 flex items-center border border-slate-100 dark:border-white/5 focus-within:bg-white dark:focus-within:bg-white/[0.06] transition-all">
                                {selectedSticker ? (
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                        <img src={fixUrl(selectedSticker)} alt="Selected" className="w-8 h-8 object-contain" />
                                        <button type="button" onClick={() => setSelectedSticker(null)} className="p-1 text-slate-400"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : audioBlob ? (
                                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-full">
                                        <span className="text-[11px] text-blue-500 font-black uppercase tracking-widest">Audio Ready</span>
                                        <button type="button" onClick={() => setAudioBlob(null)} className="p-1 text-blue-500"><X className="w-3 h-3" /></button>
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
                                            }
                                        }}
                                        placeholder="Add a comment..."
                                        rows={1}
                                        className="w-full bg-transparent border-none outline-none text-[15px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none overflow-hidden"
                                    />
                                )}
                            </div>

                            <div className="flex items-center gap-1 pb-1">
                                {!audioBlob && !selectedSticker && (
                                    <>
                                        <button type="button" onClick={() => setShowStickers(!showStickers)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors relative">
                                            <Smile className="w-5 h-5" />
                                            <AnimatePresence>{showStickers && <div className="absolute bottom-full right-0 mb-4 z-50"><StickerPicker onSelect={url => setSelectedSticker(url)} onClose={() => setShowStickers(false)} /></div>}</AnimatePresence>
                                        </button>
                                        <VoiceRecorder onRecordingComplete={blob => setAudioBlob(blob)} onCancel={() => setAudioBlob(null)} />
                                    </>
                                )}
                                <button type="submit" disabled={submitting || (!commentText.trim() && !audioBlob && !selectedSticker)} className="p-2.5 text-blue-500 disabled:text-slate-300 transition-all active:scale-90">
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center py-2"><p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Login to comment</p></div>
                    )}
                </div>
            </div>
        </div >
    );
}

