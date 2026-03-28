'use client';

import ReactionPicker from './ReactionPicker';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Clock, ThumbsUp, Laugh, Frown, Angry, Star, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import ReportModal from './ReportModal';
import { useSocket } from '@/lib/socket';
import { fixUrl } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

interface PostCardProps {
    post: any;
    isGuest?: boolean;
    onDelete?: (id?: string) => void;
    onUpdate?: (post: any) => void;
    onEdit?: (post: any) => void;
    onViewComments?: (post: any, commentId?: string) => void;
    onClick?: () => void;
    hideComments?: boolean;
}

export default function PostCard({ post, isGuest = false, onDelete, onUpdate, onEdit, onViewComments, onClick, hideComments = false }: PostCardProps) {
    const [reactionType, setReactionType] = useState<string | null>(post.userReaction || (post.isLiked ? 'like' : null));
    const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
    const [commentCount, setCommentCount] = useState(post._count?.comments || 0);

    useEffect(() => {
        setLikeCount(post._count?.likes || 0);
    }, [post._count?.likes]);

    useEffect(() => {
        setReactionType(post.userReaction || (post.isLiked ? 'like' : null));
    }, [post.userReaction, post.isLiked]);

    useEffect(() => {
        setCommentCount(post._count?.comments || 0);
    }, [post._count?.comments]);

    const [showReactions, setShowReactions] = useState(false);
    const [recentComments, setRecentComments] = useState<any[]>([]);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCommentExpanded, setIsCommentExpanded] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showMenu && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        fetchRecentComments();

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu, post.id]);

    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.emit('join_post', post.id);

        const handleNewComment = (newComment: any) => {
            if (newComment.postId === post.id) {
                setCommentCount((prev: number) => prev + 1);
                setRecentComments(prev => {
                    if (prev.find(c => c.id === newComment.id)) return prev;
                    const newList = [newComment, ...prev];
                    return newList.slice(0, 2);
                });
            }
        };

        const handleCommentDeleted = ({ postId }: { postId: string }) => {
            if (postId === post.id) {
                setCommentCount((prev: number) => Math.max(0, prev - 1));
                fetchRecentComments();
            }
        };

        socket.on('new_comment', handleNewComment);
        socket.on('comment_deleted', handleCommentDeleted);

        return () => {
            socket.emit('leave_post', post.id);
            socket.off('new_comment', handleNewComment);
            socket.off('comment_deleted', handleCommentDeleted);
        };
    }, [socket, post.id]);

    const fetchRecentComments = async () => {
        try {
            const response = await api.get(`/posts/${post.id}/comments`);
            if (response.data.length > 0) {
                // Show up to 2 most recent
                setRecentComments(response.data.slice(0, 2));
            } else {
                setRecentComments([]);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const getReactionStyle = (type: string | null) => {
        const t = type?.toLowerCase();
        switch (t) {
            case 'love': return { icon: <Heart className="w-[18px] h-[18px] text-red-500 fill-red-500" />, label: 'Love', color: 'text-red-500' };
            case 'haha': return { icon: <Laugh className="w-[18px] h-[18px] text-yellow-500 fill-yellow-500" />, label: 'Haha', color: 'text-yellow-500' };
            case 'wow': return { icon: <Star className="w-[18px] h-[18px] text-purple-500 fill-purple-500" />, label: 'Wow', color: 'text-purple-500' };
            case 'sad': return { icon: <Frown className="w-[18px] h-[18px] text-blue-400 fill-blue-400" />, label: 'Sad', color: 'text-blue-400' };
            case 'angry': return { icon: <Angry className="w-[18px] h-[18px] text-orange-500 fill-orange-500" />, label: 'Angry', color: 'text-orange-500' };
            case 'like': return { icon: <ThumbsUp className="w-[18px] h-[18px] text-blue-500 fill-blue-500" />, label: 'Like', color: 'text-blue-500' };
            default: return { icon: <ThumbsUp className="w-[18px] h-[18px]" />, label: 'Like', color: 'text-slate-400 dark:text-slate-500' };
        }
    };

    const { openAuthModal, requireAuth, user: sessionUser } = useAuth();
    const currentUserId = sessionUser?.id;

    const handleReaction = async (type: string) => {
        requireAuth(async () => {
            const previousType = reactionType;
            if (reactionType === type) {
                setReactionType(null);
                setLikeCount((prev: number) => Math.max(0, prev - 1));
            } else {
                setReactionType(type);
                if (!previousType) {
                    setLikeCount((prev: number) => prev + 1);
                }
            }
            setShowReactions(false);

            try {
                const response = await api.post(`/posts/${post.id}/like`, { type });
                if (response.data.liked) {
                    setReactionType(response.data.type);
                } else {
                    setReactionType(null);
                }
            } catch (error) {
                console.error('Failed to react:', error);
                setReactionType(previousType);
            }
        }, 'Join the community to support creators!');
    };



    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        setIsDeleting(true);
        try {
            await api.delete(`/posts/${post.id}`);
            if (onDelete) onDelete(post.id);
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('Failed to delete post');
        } finally {
            setIsDeleting(false);
        }
    };

    const isOwnPost = currentUserId === post.author.id;

    const timeAgo = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <motion.article
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`relative py-3 px-4 sm:px-0 border-b border-slate-100 dark:border-white/5 cursor-pointer ${showMenu ? 'z-[50]' : 'z-0'}`}
            onClick={onClick}
        >
            <div className="flex gap-3">
                {/* Avatar Column */}
                <Link
                    href={`/profile/${post.author.username}`}
                    prefetch={false}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0"
                >
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 bg-cover bg-center"
                            style={{ backgroundImage: post.author.avatarUrl ? `url(${fixUrl(post.author.avatarUrl)})` : undefined }}
                        >
                            {!post.author.avatarUrl && (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-white font-bold text-sm rounded-full">
                                    {(post.author.displayName || post.author.username)?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#0f172a]" />
                    </div>
                </Link>

                {/* Main Content Column */}
                <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <Link
                                href={`/profile/${post.author.username}`}
                                prefetch={false}
                                onClick={(e) => e.stopPropagation()}
                                className="font-bold text-[15px] text-slate-900 dark:text-white hover:underline truncate"
                            >
                                {post.author.displayName || post.author.username}
                            </Link>
                            {post.author.isVerified && (
                                <div className="flex-shrink-0 ml-[0px] flex items-center justify-center bg-amber-500 rounded-full w-[11.5px] h-[11.5px] mt-[1px]">
                                    <Check className="w-[6px] h-[6px] text-white" strokeWidth={6} />
                                </div>
                            )}
                            <span className="text-slate-300 dark:text-slate-600 text-[13px]">·</span>
                            <span className="text-[13px] text-slate-400 dark:text-slate-500 flex-shrink-0">{timeAgo(post.createdAt)}</span>
                        </div>

                        {/* Menu */}
                        <div className="relative flex-shrink-0" ref={menuRef}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-[110]"
                                    >
                                        <div className="py-1">
                                            {isOwnPost ? (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit && onEdit(post); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors text-sm font-medium"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit Post
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleDelete(); }}
                                                        disabled={isDeleting}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors text-sm font-medium disabled:opacity-50"
                                                    >
                                                        {isDeleting ? <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        Delete Post
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowReportModal(true); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 transition-colors text-sm font-medium"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
                                                    Report
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <ReportModal
                                isOpen={showReportModal}
                                onClose={() => setShowReportModal(false)}
                                postId={post.id}
                                targetName="this post"
                            />
                        </div>
                    </div>

                    {/* Text Content */}
                    {post.content && (
                        <div className="mb-3">
                            <p className={`text-slate-800 dark:text-slate-100 text-[15px] leading-relaxed whitespace-pre-wrap ${!isExpanded && 'line-clamp-6'}`}>
                                {post.content.split(/(\#[a-zA-Z0-9_]+\b)/).map((part: string, i: number) => {
                                    if (part.startsWith('#')) {
                                        return (
                                            <span key={i} className="text-blue-500 hover:underline cursor-pointer">
                                                {part}
                                            </span>
                                        );
                                    }
                                    return part;
                                })}
                            </p>
                            {(post.content.split('\n').length > 5 || post.content.length > 250) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                    className="text-blue-500 hover:text-blue-400 text-sm font-medium mt-1 transition-colors"
                                >
                                    {isExpanded ? 'Show less' : 'Show more'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Image */}
                    {post.imageUrl && (
                        <div className="mb-3 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900">
                            <img
                                src={fixUrl(post.imageUrl)}
                                alt="Post"
                                className="w-full h-auto max-h-[500px] object-cover"
                            />
                        </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-center gap-1 -ml-1.5">
                        {/* React */}
                        <div
                            className="relative"
                            onMouseEnter={() => setShowReactions(true)}
                            onMouseLeave={() => setShowReactions(false)}
                            onTouchStart={() => {
                                const timer = setTimeout(() => setShowReactions(true), 500);
                                (window as any)._reactionTimer = timer;
                            }}
                            onTouchEnd={() => {
                                if ((window as any)._reactionTimer) clearTimeout((window as any)._reactionTimer);
                            }}
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
                                onClick={(e) => { e.stopPropagation(); handleReaction(reactionType || 'like'); }}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-colors group ${getReactionStyle(reactionType).color} hover:bg-slate-50 dark:hover:bg-slate-800/50`}
                            >
                                <div className={`p-0.5 rounded-full transition-colors ${reactionType ? '' : 'group-hover:bg-red-50 dark:group-hover:bg-red-500/10'}`}>
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

                        {/* Comment */}
                        {!hideComments && (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); requireAuth(() => onViewComments && onViewComments(post), 'Log in to join the conversation!') }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group"
                            >
                                <div className="p-0.5 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                                    <MessageCircle className="w-[18px] h-[18px]" />
                                </div>
                                {commentCount > 0 && (
                                    <span className="text-[13px] font-medium">{commentCount}</span>
                                )}
                            </motion.button>
                        )}

                        {/* Spacer to push Share to the right */}
                        <div className="flex-1" />

                        {/* Share */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
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
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-green-500 dark:hover:text-green-400 transition-colors group"
                        >
                            <div className="p-0.5 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-500/10 transition-colors">
                                <Share2 className="w-[18px] h-[18px]" />
                            </div>
                        </motion.button>
                    </div>

                    {/* Comment Previews */}
                    {!hideComments && recentComments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-3">
                            {recentComments.filter(c => !c.parentId || !recentComments.find(p => p.id === c.parentId)).map((rootComment) => (
                                <div key={rootComment.id} className="space-y-3">
                                    {/* Root Comment */}
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            requireAuth(() => onViewComments && onViewComments(post, rootComment.id), 'Log in to join the conversation!');
                                        }}
                                        className="flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-300 cursor-pointer"
                                    >
                                        <Link href={`/profile/${rootComment.user?.username}`} className="flex-shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-white/5">
                                                {rootComment.user?.avatarUrl ? (
                                                    <img src={fixUrl(rootComment.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-bold">
                                                        {(rootComment.user?.displayName || rootComment.user?.username)?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                        <div className="w-full min-w-0">
                                            <Link href={`/profile/${rootComment.user?.username}`} className="text-[13px] font-bold text-slate-900 dark:text-white hover:underline block leading-tight mb-0.5" onClick={(e) => e.stopPropagation()}>
                                                {rootComment.user?.displayName || rootComment.user?.username || 'User'}
                                            </Link>
                                            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-normal line-clamp-2">
                                                {rootComment.content}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Direct Replies (if any in the 2-comment slice) */}
                                    {recentComments.filter(reply => reply.parentId === rootComment.id).map(reply => (
                                        <div
                                            key={reply.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                requireAuth(() => onViewComments && onViewComments(post, reply.id), 'Log in to join the conversation!');
                                            }}
                                            className="ml-3 pl-3 border-l-2 border-slate-100 dark:border-white/5 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-300 cursor-pointer"
                                        >
                                            <Link href={`/profile/${reply.user?.username}`} className="flex-shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-white/5">
                                                    {reply.user?.avatarUrl ? (
                                                        <img src={fixUrl(reply.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[9px] font-bold">
                                                            {(reply.user?.displayName || reply.user?.username)?.[0]?.toUpperCase() || 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                            <div className="w-full min-w-0">
                                                <Link href={`/profile/${reply.user?.username}`} className="text-[12px] font-bold text-slate-900 dark:text-white hover:underline block leading-tight mb-0.5" onClick={(e) => e.stopPropagation()}>
                                                    {reply.user?.displayName || reply.user?.username || 'User'}
                                                </Link>
                                                <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal line-clamp-2">
                                                    {reply.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}

                            {!hideComments && commentCount > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); requireAuth(() => onViewComments && onViewComments(post), 'Log in to join the conversation!') }}
                                    className="text-[13px] font-bold text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ml-9"
                                >
                                    View all {commentCount} comments
                                </button>
                            )}
                        </div>
                    )}


                </div>
            </div>
        </motion.article>
    );
}
