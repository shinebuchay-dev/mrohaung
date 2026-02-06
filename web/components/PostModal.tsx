'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Clock, Check, Play, Square, Smile, ThumbsUp, Laugh, Frown, Angry, Star, Flag } from 'lucide-react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import VoiceRecorder from './VoiceRecorder';
import { useSocket } from '@/lib/socket';
import StickerPicker from './StickerPicker';
import ReactionPicker from './ReactionPicker';

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    onUpdate?: () => void;
    onDelete?: () => void;
    currentUserId?: string;
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

const AudioCommentPlayer = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);

    return (
        <div className="flex items-center gap-2 mt-2 bg-[#334155]/40 p-2 pr-4 rounded-xl w-fit border border-[#334155]/30">
            <button
                type="button"
                onClick={() => {
                    if (!audioRef.current) return;
                    if (playing) {
                        audioRef.current.pause();
                    } else {
                        audioRef.current.play();
                    }
                }}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors shadow-blue-500/20 shadow-lg"
            >
                {playing ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
            <div className="flex flex-col min-w-[100px]">
                <span className="text-[9px] text-blue-300 font-bold uppercase tracking-wider mb-1">Voice Message</span>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-blue-400 rounded-full transition-all duration-200 ${playing ? 'w-full animate-pulse' : 'w-1/3'}`} />
                </div>
            </div>
            <audio
                ref={audioRef}
                src={src}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                className="hidden"
            />
        </div>
    );
};

function CommentItem({ comment, currentUserId, onUpdate, onDelete, onReply, replies = [] }: { comment: any; currentUserId?: string; onUpdate?: (id: string, content: string) => void; onDelete?: (id: string) => void; onReply?: (username: string, commentId: string) => void; replies?: any[] }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content || '');
    const [showMenu, setShowMenu] = useState(false);
    const [saving, setSaving] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [showReplyInput, setShowReplyInput] = useState(false);

    const editRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && editRef.current) {
            editRef.current.style.height = 'auto';
            editRef.current.style.height = editRef.current.scrollHeight + 'px';
        }
    }, [editContent, isEditing]);

    const isOwnComment = currentUserId === comment.user?.id;

    const handleSaveEdit = async () => {
        if (!editContent.trim() && !comment.stickerUrl && !comment.audioUrl) return;
        setSaving(true);
        try {
            await api.put(`/comments/${comment.id}`, { content: editContent });
            comment.content = editContent;
            setIsEditing(false);
            if (onUpdate) onUpdate(comment.id, editContent);
        } catch (error) {
            console.error('Failed to update comment:', error);
            alert('Failed to update comment');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this comment?')) return;
        try {
            await api.delete(`/comments/${comment.id}`);
            if (onDelete) onDelete(comment.id);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('Failed to delete comment');
        }
    };

    const handleLike = () => {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
        // TODO: API call to like comment
    };

    return (
        <div className="flex flex-col w-full gap-1">
            <div className="flex items-start gap-2 group relative w-full">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 overflow-hidden ring-2 ring-blue-500/10 mt-0.5">
                    {comment.user?.avatarUrl ? (
                        <img src={comment.user.avatarUrl} alt={comment.user?.displayName || comment.user?.username || ''} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-700">
                            <span className="text-white text-[10px] font-bold">
                                {(comment.user?.displayName || comment.user?.username)?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex-1 flex items-start gap-1 min-w-0">
                    <div className="flex flex-col gap-1">
                        <div className="bg-[#1e293b]/60 backdrop-blur-sm rounded-2xl px-3 py-1.5 border border-[#334155]/20 hover:border-[#475569]/30 transition-all w-fit max-w-[214px]">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-xs font-bold text-white">
                                    {comment.user?.displayName || comment.user?.username || 'User'}
                                </p>
                            </div>
                            {isEditing ? (
                                <div className="w-full">
                                    <textarea
                                        ref={editRef}
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full bg-transparent border-none p-0 text-[13px] text-[#e2e8f0] resize-none focus:outline-none focus:ring-0 overflow-hidden min-h-[20px] leading-relaxed"
                                        placeholder="Edit your comment..."
                                        autoFocus
                                        rows={1}
                                        maxLength={10000}
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button
                                            onClick={() => { setIsEditing(false); setEditContent(comment.content || ''); }}
                                            className="text-[10px] font-medium text-[#94a3b8] hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={saving}
                                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[10px] font-bold text-white rounded shadow-sm transition-all flex items-center gap-1"
                                        >
                                            {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {comment.content && (
                                        <div className="relative">
                                            <p className={`text-[13px] text-[#e2e8f0] leading-relaxed break-words whitespace-pre-wrap ${!isExpanded && 'line-clamp-3'}`}>
                                                {comment.content}
                                            </p>
                                            {comment.content.length > 120 && (
                                                <button
                                                    onClick={() => setIsExpanded(!isExpanded)}
                                                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors mt-1 block hover:underline"
                                                >
                                                    {isExpanded ? 'See Less' : 'See More'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {comment.stickerUrl && <img src={comment.stickerUrl} alt="Sticker" className="w-16 h-16 object-contain mt-1.5" />}
                                    {comment.audioUrl && <div className="mt-1.5"><AudioCommentPlayer src={comment.audioUrl} /></div>}
                                </>
                            )}
                        </div>
                        {/* Action Buttons - Like & Reply */}
                        {!isEditing && (
                            <div className="flex items-center gap-3 px-2">
                                <button
                                    onClick={handleLike}
                                    className={`text-[11px] font-bold transition-colors ${liked ? 'text-blue-500' : 'text-[#64748b] hover:text-blue-400'}`}
                                >
                                    Like{likeCount > 0 && ` · ${likeCount}`}
                                </button>
                                <button
                                    onClick={() => onReply && onReply(comment.user?.username || 'User', comment.id)}
                                    className="text-[11px] font-bold text-[#64748b] hover:text-blue-400 transition-colors"
                                >
                                    Reply
                                </button>
                                <span className="text-[10px] text-[#64748b]">{formatTimeRelative(comment.createdAt)}</span>
                            </div>
                        )}
                    </div>
                    {isOwnComment && !isEditing && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-full transition-all text-[#64748b] hover:text-white"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <AnimatePresence>
                                {showMenu && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                            className="absolute right-0 mt-1 w-32 bg-[#1e293b]/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-[150] border border-[#334155]/50"
                                        >
                                            <div className="py-0.5">
                                                <button
                                                    onClick={() => { setShowMenu(false); setIsEditing(true); }}
                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-[#334155]/50 transition-colors group/edit font-semibold"
                                                >
                                                    <Edit2 className="w-3 h-3 text-blue-400" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => { setShowMenu(false); handleDelete(); }}
                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors group/delete font-semibold"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-400" />
                                                    Delete
                                                </button>
                                            </div>
                                        </motion.div>
                                        <div className="fixed inset-0 z-[140]" onClick={() => setShowMenu(false)} />
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
            {/* Render Replies */}
            {replies.length > 0 && (
                <div className="pl-11 mt-2 space-y-3 relative">
                    <div className="absolute left-[1.35rem] top-0 bottom-0 w-0.5 bg-[#334155]/20 rounded-full" />
                    {replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            currentUserId={currentUserId}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onReply={onReply}
                            replies={[]} // Limit nesting to 1 level for now
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PostModal({ isOpen, onClose, post, onUpdate, onDelete, currentUserId }: PostModalProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content || '');
    const [saving, setSaving] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [reactionType, setReactionType] = useState<string | null>(null);
    const [showReactions, setShowReactions] = useState(false);

    // Voice & Sticker State
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [showStickers, setShowStickers] = useState(false);
    const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string, username: string } | null>(null);

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
            checkLikeStatus();
            fetchCurrentUser();
            // Reset Comment State
            setCommentText('');
            setAudioBlob(null);
            setSelectedSticker(null);
            setShowStickers(false);
            setReplyingTo(null);

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
    }, [isOpen, post, socket]);

    const fetchCurrentUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setCurrentUser(response.data);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
        }
    };

    const checkLikeStatus = async () => {
        // Placeholder
    };

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

    const getReactionIcon = (type: string | null) => {
        switch (type) {
            case 'love': return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
            case 'haha': return <Laugh className="w-4 h-4 text-yellow-500" />;
            case 'wow': return <Star className="w-4 h-4 text-purple-500" />;
            case 'sad': return <Frown className="w-4 h-4 text-blue-400" />;
            case 'angry': return <Angry className="w-4 h-4 text-orange-500" />;
            case 'like': return <ThumbsUp className="w-4 h-4 text-blue-500 fill-blue-500" />;
            default: return <Heart className="w-4 h-4 text-[#64748b]" />;
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

    const handleReply = (username: string, commentId: string) => {
        setReplyingTo({ id: commentId, username });
        commentTextareaRef.current?.focus();
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() && !audioBlob && !selectedSticker) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            if (commentText.trim()) formData.append('content', commentText);
            if (audioBlob) formData.append('audio', audioBlob, 'voice-comment.webm');
            if (selectedSticker) formData.append('stickerUrl', selectedSticker);
            if (replyingTo) formData.append('parentId', replyingTo.id);

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
            setReplyingTo(null);

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

    const handleLike = async () => {
        if (!currentUserId) {
            alert('Please login to like posts!');
            return;
        }
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount((prev: number) => newLiked ? prev + 1 : prev - 1);
        try {
            await api.post(`/posts/${post.id}/like`);
        } catch (error) {
            console.error('Failed to like post:', error);
            setLiked(!newLiked);
            setLikeCount((prev: number) => !newLiked ? prev + 1 : prev - 1);
        }
    };

    const handleSaveEdit = async () => {
        if (!editContent.trim()) return;
        setSaving(true);
        try {
            await api.put(`/posts/${post.id}`, { content: editContent });
            post.content = editContent;
            setIsEditing(false);
            if (onUpdate) onUpdate();
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
            if (onDelete) onDelete();
            onClose();
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('Failed to delete post');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Post details"
                className="bg-[#1e293b] sm:border border-none border-[#334155]/60 sm:rounded-3xl rounded-none w-full max-w-lg h-full sm:h-auto sm:max-h-[80vh] flex flex-col overflow-hidden shadow-2xl relative"
            >
                {/* Close Button */}
                {/* Header Actions */}


                {/* Main Header Bar (Mobile Only) */}
                <div className="sm:hidden sticky top-0 z-[50] bg-[#1e293b] px-4 h-[44px] flex items-center justify-between border-none">
                    <h2 className="text-[15px] font-bold text-white tracking-wide">Post</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-[#334155]/50 hover:bg-[#475569]/70 rounded-full text-[#94a3b8] hover:text-white transition-all duration-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {/* Post Header (Author Info) - Sticky */}
                    <div className="sticky top-0 z-[40] bg-[#1e293b] px-4 sm:py-3 pt-8 pb-3 mt-0 flex items-center justify-between border-b border-[#334155]/10">
                        <div className="flex items-center gap-3">
                            <Link href={`/profile/${post.author.username}`} className="relative flex-shrink-0 group" onClick={onClose}>
                                <div className="w-10 h-10 rounded-full bg-[#334155] bg-cover bg-center ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-300" style={{ backgroundImage: post.author.avatarUrl ? `url(${post.author.avatarUrl})` : undefined }} />
                                <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1e293b]" />
                            </Link>
                            <div className="flex flex-col justify-center">
                                <Link href={`/profile/${post.author.username}`} className="text-white font-bold text-[15px] hover:underline decoration-blue-500/50 underline-offset-2 leading-tight" onClick={onClose}>
                                    {post.author.displayName || post.author.username}
                                </Link>
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748b] mt-0.5">
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
                                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${showMenu ? 'bg-[#334155] text-white' : 'hover:bg-[#334155]/50 text-[#94a3b8] hover:text-white'}`}
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
                                                className="absolute right-0 mt-1 w-48 bg-[#1e293b]/98 backdrop-blur-2xl border border-[#334155]/70 rounded-xl shadow-2xl overflow-hidden z-[110] border border-[#334155]/50"
                                            >
                                                <div className="py-1">
                                                    {isOwnPost ? (
                                                        <>
                                                            <button
                                                                onClick={() => { setShowMenu(false); setIsEditing(true); }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#334155]/50 text-white transition-colors text-sm font-medium group"
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
                                className="hidden sm:flex w-8 h-8 items-center justify-center bg-[#334155]/50 hover:bg-[#475569]/70 rounded-full text-[#94a3b8] hover:text-white transition-all duration-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Post Body & Details */}
                    <div className="px-4 pt-3 pb-0 bg-[#0f172a]/30">
                        {/* Body */}
                        <div className={isEditing ? "mb-1" : "mb-3"}>
                            {isEditing ? (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <textarea ref={editTextareaRef} value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-transparent border-none outline-none focus:ring-0 text-white placeholder-[#64748b] resize-none py-1 text-[15px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ minHeight: EDIT_TEXTAREA_MIN_HEIGHT, maxHeight: EDIT_TEXTAREA_MAX_HEIGHT }} rows={1} placeholder="Edit your post..." autoFocus maxLength={65000} />
                                </div>
                            ) : (
                                <>{post.content && <p className="text-[#e2e8f0] text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>}</>
                            )}
                        </div>
                        {post.imageUrl && <div className="rounded-lg overflow-hidden bg-black mb-3 border border-[#334155]/50"><img src={post.imageUrl} alt="Post" className="w-full h-auto max-h-[400px] object-contain mx-auto" /></div>}

                        {isEditing && (
                            <div className="flex justify-center gap-3 py-4 border-t border-[#334155]/40 mt-2">
                                <button onClick={() => { setIsEditing(false); setEditContent(post.content || ''); }} className="px-6 py-2.5 text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors bg-[#334155]/30 hover:bg-[#334155]/50 rounded-xl border border-[#334155]/50 min-w-[120px]">Cancel</button>
                                <button onClick={handleSaveEdit} disabled={saving || !editContent.trim()} className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-sm font-bold text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 min-w-[160px]">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> <span>Save Changes</span></>}</button>
                            </div>
                        )}
                        {!isEditing && (
                            <div className="px-4 h-[50px] flex items-center justify-between border-t border-[#334155]/30">
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
                                            className="flex items-center gap-1.5 group/like relative z-10 translate-y-[1px]"
                                        >
                                            <div className="p-2 rounded-full group-hover/like:bg-white/5 transition-colors">
                                                {getReactionIcon(reactionType)}
                                            </div>
                                            <span className={`text-xs font-bold transition-colors ${reactionType ? 'text-blue-500' : 'text-[#64748b] group-hover/like:text-blue-500'}`}>{likeCount}</span>
                                        </motion.button>
                                    </div>
                                    <div className="flex items-center gap-1.5 group/comment translate-y-[1px]">
                                        <div className="p-2 rounded-full group-hover/comment:bg-blue-500/10 transition-colors"><MessageCircle className="w-4 h-4 text-[#64748b] group-hover/comment:text-blue-500 transition-colors" /></div>
                                        <span className="text-xs font-bold text-[#64748b] group-hover/comment:text-blue-500 transition-colors">{comments.length}</span>
                                    </div>
                                </div>
                                <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-full hover:bg-white/5 transition-colors text-[#64748b] hover:text-white group/share translate-y-[1px]"><Share2 className="w-4 h-4" /></motion.button>
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="border-t border-[#334155]/30 px-4 py-2 bg-[#0f172a]/20">
                        {/* Comments Section */}
                        <div
                            className="flex-1 overflow-y-auto min-h-0 bg-[#0f172a]/20 custom-scrollbar"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div className="p-4 space-y-4">
                                {comments.length > 0 ? (
                                    <div className="space-y-3.5 pb-4">
                                        <div className="space-y-3.5 pb-4">
                                            {comments.filter(c => !c.parentId).map((comment) => (
                                                <CommentItem
                                                    key={comment.id}
                                                    comment={comment}
                                                    currentUserId={currentUserId}
                                                    onUpdate={(id, content) => setComments(prev => prev.map(c => c.id === id ? { ...c, content } : c))}
                                                    onDelete={(id) => setComments(prev => prev.filter(c => c.id !== id))}
                                                    onReply={handleReply}
                                                    replies={comments.filter(c => c.parentId === comment.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6"><p className="text-[#64748b] text-xs">No comments yet</p><p className="text-[11px] text-[#475569] mt-0.5">Start the conversation!</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Input (Sticky) */}
                <div className="flex-none px-3 py-2 bg-[#0f172a]/20 z-10 w-full">
                    {currentUserId ? (
                        <form onSubmit={handleSubmitComment} className="flex gap-2 items-end w-full">
                            {/* Left: Input Area */}
                            <div className="flex-1 bg-[#1e293b]/40 hover:bg-[#1e293b]/60 transition-colors rounded-2xl px-3 py-2 min-h-[44px] flex items-center">
                                {selectedSticker ? (
                                    <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-1 rounded-xl border border-[#334155] w-fit">
                                        <img src={selectedSticker} alt="Selected" className="w-8 h-8 object-contain" />
                                        <button type="button" onClick={() => setSelectedSticker(null)} className="p-1 hover:bg-white/10 rounded-full text-[#94a3b8]"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : replyingTo ? (
                                    <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-1 rounded-xl border border-[#334155] w-fit mb-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-bold">Replying to</span>
                                            <span className="text-xs text-blue-400 font-bold">@{replyingTo.username}</span>
                                        </div>
                                        <button type="button" onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full text-[#94a3b8] ml-2"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : audioBlob ? (
                                    <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 w-fit">
                                        <span className="text-xs text-blue-300 font-medium whitespace-nowrap">Voice recording ready</span>
                                        <button type="button" onClick={() => setAudioBlob(null)} className="p-1 hover:bg-white/10 rounded-full text-blue-200"><X className="w-3 h-3" /></button>
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
                                        className="w-full bg-transparent border-none outline-none text-[15px] text-white placeholder-[#64748b] resize-none overflow-hidden min-h-[24px] py-0 break-words whitespace-pre-wrap"
                                        style={{ height: 'auto' }}
                                        maxLength={10000}
                                    />
                                )}
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-1 shrink-0 pb-1">
                                {!audioBlob && !selectedSticker && !replyingTo && (
                                    <>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowStickers(!showStickers)}
                                                className="p-2 text-[#94a3b8] hover:bg-[#334155] hover:text-blue-400 rounded-full transition-all"
                                            >
                                                <Smile className="w-5 h-5" />
                                            </button>
                                            <AnimatePresence>
                                                {showStickers && (
                                                    <div className="absolute bottom-full right-0 mb-2 z-50">
                                                        <StickerPicker
                                                            onSelect={(url) => setSelectedSticker(url)}
                                                            onClose={() => setShowStickers(false)}
                                                        />
                                                    </div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <VoiceRecorder
                                            onRecordingComplete={(blob) => setAudioBlob(blob)}
                                            onCancel={() => { }}
                                        />
                                    </>
                                )}
                                <button
                                    type="submit"
                                    disabled={(!commentText.trim() && !audioBlob && !selectedSticker) || submitting}
                                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-[#334155] text-white rounded-full transition-all shadow-lg shadow-blue-500/20"
                                >
                                    <Send className="w-4 h-4 translate-x-px translate-y-px" />
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center justify-between px-2">
                            <p className="text-sm text-[#94a3b8]">Log in to like or comment.</p>
                            <Link href="/login" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition-colors">
                                Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
