'use client';

import ReactionPicker from './ReactionPicker';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Clock, ThumbsUp, Laugh, Frown, Angry, Star } from 'lucide-react';
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
    onViewComments?: (post: any) => void;
    onClick?: () => void;
}

export default function PostCard({ post, isGuest = false, onDelete, onUpdate, onEdit, onViewComments, onClick }: PostCardProps) {
    const [reactionType, setReactionType] = useState<string | null>(null);
    const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
    const [commentCount, setCommentCount] = useState(post._count?.comments || 0);

    useEffect(() => {
        setLikeCount(post._count?.likes || 0);
    }, [post._count?.likes]);

    useEffect(() => {
        setCommentCount(post._count?.comments || 0);
    }, [post._count?.comments]);
    const [showReactions, setShowReactions] = useState(false);

    const [firstComment, setFirstComment] = useState<any>(null);
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

        // Fetch first comment
        fetchFirstComment();

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
                if (!firstComment) setFirstComment(newComment);
            }
        };

        const handleCommentDeleted = ({ postId }: { postId: string }) => {
            if (postId === post.id) {
                setCommentCount((prev: number) => Math.max(0, prev - 1));
                fetchFirstComment();
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

    const fetchFirstComment = async () => {
        try {
            const response = await api.get(`/posts/${post.id}/comments`);
            if (response.data.length > 0) {
                setFirstComment(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const getReactionIcon = (type: string | null) => {
        switch (type) {
            case 'love': return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
            case 'haha': return <Laugh className="w-5 h-5 text-yellow-500" />;
            case 'wow': return <Star className="w-5 h-5 text-purple-500" />;
            case 'sad': return <Frown className="w-5 h-5 text-blue-400" />;
            case 'angry': return <Angry className="w-5 h-5 text-orange-500" />;
            case 'like': return <ThumbsUp className="w-5 h-5 text-blue-500 fill-blue-500" />;
            default: return <Heart className="w-5 h-5 text-slate-500 dark:text-[#64748b]" />;
        }
    };

    const { openAuthModal, requireAuth, user: sessionUser } = useAuth();
    const currentUserId = sessionUser?.id;

    const handleReaction = async (type: string) => {
        requireAuth(async () => {
            const previousType = reactionType;
            // Optimistic UI Update
            if (reactionType === type) {
                // Toggle off
                setReactionType(null);
                setLikeCount((prev: number) => Math.max(0, prev - 1));
            } else {
                // Change or Add
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-[1.5rem] mb-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${showMenu ? 'z-[50]' : 'z-0'}`}
            onClick={onClick}
        >
            {/* Header */}
            <div className="p-3 sm:p-4 flex items-center justify-between">
                <Link href={`/profile/${post.author.username}`} prefetch={false} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 bg-cover bg-center ring-1 ring-slate-200 dark:ring-white/10"
                            style={{ backgroundImage: post.author.avatarUrl ? `url(${fixUrl(post.author.avatarUrl)})` : undefined }}
                        >
                            {!post.author.avatarUrl && (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-white font-bold text-sm">
                                    {(post.author.displayName || post.author.username)?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-200 dark:border-[#1e293b]" />
                    </div>
                    <div>
                        <h3 className="text-slate-900 dark:text-white font-bold text-[15px]">{post.author.displayName || post.author.username}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <Clock className="w-3 h-3" />
                            <p>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>Public</span>
                        </div>
                    </div>
                </Link>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className={`p-2 rounded-xl transition-all ${showMenu ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-[110]"
                            >
                                <div className="py-1">
                                    {isOwnPost ? (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit && onEdit(post); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors text-sm font-semibold"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit Post
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleDelete(); }}
                                                disabled={isDeleting}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors text-sm font-semibold disabled:opacity-50"
                                            >
                                                {isDeleting ? <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                Delete Post
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowReportModal(true); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 transition-colors text-sm font-semibold"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
                                            Report Post
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

            {/* Content */}
            {post.content && (
                <div className="px-4 pb-3">
                    <p className={`text-slate-900 dark:text-white text-[15px] leading-relaxed whitespace-pre-wrap ${!isExpanded && 'line-clamp-6'}`}>
                        {post.content.split(/(\#[a-zA-Z0-9_]+\b)/).map((part: string, i: number) => {
                            if (part.startsWith('#')) {
                                return (
                                    <span key={i} className="text-blue-500 hover:underline cursor-pointer transition-all">
                                        {part}
                                    </span>
                                );
                            }
                            return part;
                        })}
                    </p>
                    {post.content.split('\n').length > 3 || post.content.length > 150 ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-semibold mt-1 transition-colors"
                        >
                            {isExpanded ? 'See less' : 'See more'}
                        </button>
                    ) : null}
                </div>
            )}

            {/* Image */}
            {post.imageUrl && (
                <div className="relative w-full bg-slate-50 dark:bg-slate-900 overflow-hidden border-y border-slate-100 dark:border-white/5">
                    <img
                        src={fixUrl(post.imageUrl)}
                        alt="Post"
                        className="w-full h-auto max-h-[600px] object-contain"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="px-2 py-1.5 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-1">
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
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); handleReaction(reactionType || 'like'); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors z-10 hover:bg-slate-100 dark:hover:bg-white/5 ${reactionType ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <div className="flex items-center justify-center">
                                {getReactionIcon(reactionType)}
                            </div>
                            <span className="text-sm font-bold">
                                {likeCount > 0 ? likeCount : 'React'}
                            </span>
                        </motion.button>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); requireAuth(() => onViewComments && onViewComments(post), 'Log in to join the conversation!') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-bold">
                            {commentCount > 0 ? commentCount : 'Comment'}
                        </span>
                    </motion.button>
                </div>

                <motion.button
                    whileTap={{ scale: 0.95 }}
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
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                    <Share2 className="w-5 h-5" />
                </motion.button>
            </div>

            {/* First Comment Preview */}
            {firstComment && (
                <div onClick={(e) => e.stopPropagation()} className="border-t border-slate-100 dark:border-white/5 px-4 py-3 bg-slate-50 dark:bg-black/10">
                    <div className="flex items-start gap-2.5">
                        <Link href={`/profile/${firstComment.user?.username}`} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-white/10 mt-1">
                            {firstComment.user?.avatarUrl ? (
                                <img src={fixUrl(firstComment.user.avatarUrl)} alt={firstComment.user?.displayName || firstComment.user?.username || ''} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-slate-500 dark:text-white text-xs font-bold">
                                        {(firstComment.user?.displayName || firstComment.user?.username)?.[0]?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                            )}
                        </Link>
                        <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
                            <div className="bg-white dark:bg-[#1e293b] rounded-2xl px-3 py-2 border border-slate-200 dark:border-white/5 shadow-sm w-fit max-w-full">
                                <Link href={`/profile/${firstComment.user?.username}`} className="flex items-center gap-1.5 mb-1 hover:opacity-80">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{firstComment.user?.displayName || firstComment.user?.username || 'User'}</p>
                                    <span className="text-[10px] text-slate-400">·</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{new Date(firstComment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </Link>
                                <div className="relative">
                                    <p className={`text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words ${!isCommentExpanded && 'line-clamp-3'}`}>
                                        {firstComment.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {commentCount > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); requireAuth(() => onViewComments && onViewComments(post), 'Log in to join the conversation!') }}
                            className="mt-2 ml-10 text-sm font-semibold text-slate-500 hover:text-blue-500 transition-colors"
                        >
                            View all {commentCount} comments
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    );
}
