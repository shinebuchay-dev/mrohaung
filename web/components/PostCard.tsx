'use client';

import ReactionPicker from './ReactionPicker';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Clock, ThumbsUp, Laugh, Frown, Angry, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import ReportModal from './ReportModal';
import { useSocket } from '@/lib/socket';

interface PostCardProps {
    post: any;
    isGuest?: boolean;
    onDelete?: () => void;
    onUpdate?: () => void;
    onEdit?: (post: any) => void;
    onViewComments?: (post: any) => void;
}

export default function PostCard({ post, isGuest = false, onDelete, onUpdate, onEdit, onViewComments }: PostCardProps) {
    const [reactionType, setReactionType] = useState<string | null>(null);
    const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
    const [commentCount, setCommentCount] = useState(post._count?.comments || 0);
    const [showReactions, setShowReactions] = useState(false);

    const [firstComment, setFirstComment] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCommentExpanded, setIsCommentExpanded] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUserId(user.id);

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
            default: return <Heart className="w-5 h-5 text-[#64748b]" />;
        }
    };

    const handleReaction = async (type: string) => {
        if (isGuest) {
            // Ideally redirect or show modal. For now, alert or link.
            // Since we are in an app, maybe router push?
            // window.location.href = '/login'; 
            // Or just do nothing and let them see the CTA at top.
            alert('Please login to react to posts!');
            return;
        }

        const previousType = reactionType;
        // const previousCount = likeCount; // Keep if needed for rollback logic

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
            // Revert state if needed, simpler to just re-fetch or leave as is for now
            setReactionType(previousType);
            // setLikeCount(previousCount);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        setIsDeleting(true);
        try {
            await api.delete(`/posts/${post.id}`);
            if (onDelete) onDelete();
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-gradient-to-br from-[#1e293b]/60 to-[#0f172a]/40 backdrop-blur-xl border border-[#334155]/50 rounded-2xl mb-4 hover:border-[#475569]/70 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group relative ${showMenu ? 'z-[100]' : 'z-auto'}`}
        >
            {/* Header */}
            <div className="p-2 flex items-center justify-between">
                <Link href={`/profile/${post.author.username}`} prefetch={false} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-cover bg-center ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-300"
                            style={{ backgroundImage: post.author.avatarUrl ? `url(${post.author.avatarUrl})` : undefined }}
                        >
                            {!post.author.avatarUrl && (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                                    {(post.author.displayName || post.author.username)?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1e293b]" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-[15px]">{post.author.displayName || post.author.username}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748b] mt-0.5 font-medium">
                            <Clock className="w-3 h-3" />
                            <p>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            <span className="w-1 h-1 rounded-full bg-[#334155]" />
                            <span className="text-blue-500/80">Public</span>
                        </div>
                    </div>
                </Link>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className={`p-2 rounded-xl transition-all ${showMenu ? 'bg-[#334155] text-white' : 'text-[#64748b] hover:text-white hover:bg-[#334155]/50'}`}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-1 w-40 bg-[#1e293b]/98 backdrop-blur-2xl border border-[#334155]/70 rounded-xl shadow-2xl overflow-hidden z-[110]"
                            >
                                <div className="py-0.5">
                                    {isOwnPost ? (
                                        <>
                                            <button
                                                onClick={() => { setShowMenu(false); onEdit && onEdit(post); }}
                                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#334155]/50 text-white transition-colors text-xs font-semibold group"
                                            >
                                                <div className="p-1.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                                    <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                                                </div>
                                                Edit Post
                                            </button>
                                            <button
                                                onClick={() => { setShowMenu(false); handleDelete(); }}
                                                disabled={isDeleting}
                                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 text-red-500 transition-colors text-xs font-semibold group disabled:opacity-50"
                                            >
                                                <div className="p-1.5 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                                                    {isDeleting ? <div className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </div>
                                                Delete Post
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-yellow-500/10 text-yellow-500 transition-colors text-xs font-semibold group"
                                        >
                                            <div className="p-1.5 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
                                            </div>
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
                <div className="px-3 pb-2">
                    <p className={`text-[#e2e8f0] text-[15px] leading-relaxed whitespace-pre-wrap ${!isExpanded && 'line-clamp-6'}`}>
                        {post.content.split(/(\#[a-zA-Z0-9_]+\b)/).map((part: string, i: number) => {
                            if (part.startsWith('#')) {
                                return (
                                    <span key={i} className="text-blue-400 font-semibold hover:underline cursor-pointer transition-all">
                                        {part}
                                    </span>
                                );
                            }
                            return part;
                        })}
                    </p>
                    {post.content.split('\n').length > 3 || post.content.length > 150 ? (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-blue-500 hover:text-blue-400 text-xs font-semibold mt-1 transition-colors"
                        >
                            {isExpanded ? 'See less' : 'See more'}
                        </button>
                    ) : null}
                </div>
            )}

            {/* Image */}
            {post.imageUrl && (
                <div className="relative aspect-video w-full bg-[#0f172a] overflow-hidden border-y border-[#334155]/20">
                    <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            )}

            {/* Actions */}
            <div className="px-3 py-2 flex items-center justify-between border-t border-[#334155]/30">
                <div className="flex items-center gap-3">
                    {/* Reaction Picker Logic */}
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
                            onClick={() => handleReaction(reactionType || 'like')}
                            className="flex items-center gap-1.5 group/like relative z-10"
                        >
                            <div className="p-1.5 rounded-full group-hover/like:bg-white/5 transition-colors">
                                {getReactionIcon(reactionType)}
                            </div>
                            <span className={`text-xs font-bold transition-colors ${reactionType ? 'text-blue-500' : 'text-[#64748b] group-hover/like:text-blue-500'}`}>
                                {likeCount}
                            </span>
                        </motion.button>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onViewComments && onViewComments(post)}
                        className="flex items-center gap-1.5 group/comment"
                    >
                        <div className="p-1.5 rounded-full group-hover/comment:bg-blue-500/10 transition-colors">
                            <MessageCircle className="w-4 h-4 text-[#64748b] group-hover/comment:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-xs font-bold text-[#64748b] group-hover/comment:text-blue-500 transition-colors">{commentCount}</span>
                    </motion.button>
                </div>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-[#64748b] hover:text-white group/share"
                >
                    <Share2 className="w-4 h-4" />
                </motion.button>
            </div>

            {/* First Comment Preview */}
            {firstComment && (
                <div className="border-t border-[#334155]/30 px-3 py-2.5 bg-[#0f172a]/20">
                    <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 overflow-hidden ring-2 ring-blue-500/10">
                            {firstComment.user?.avatarUrl ? (
                                <img src={firstComment.user.avatarUrl} alt={firstComment.user?.displayName || firstComment.user?.username || ''} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-white text-[10px] font-bold">
                                        {(firstComment.user?.displayName || firstComment.user?.username)?.[0]?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col items-start gap-1">
                            <div className="bg-[#1e293b]/40 backdrop-blur-sm rounded-2xl px-3 py-1.5 border border-[#334155]/20 hover:border-[#475569]/30 transition-colors w-fit max-w-full">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <p className="text-xs font-bold text-white">{firstComment.user?.displayName || firstComment.user?.username || 'User'}</p>
                                    <span className="text-[10px] text-[#64748b]">·</span>
                                    <span className="text-[10px] text-[#64748b]">{new Date(firstComment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="relative">
                                    <p className={`text-xs text-[#cbd5e1] leading-relaxed break-words ${!isCommentExpanded && 'line-clamp-3'}`}>
                                        {firstComment.content}
                                    </p>
                                    {firstComment.content && firstComment.content.length > 150 && !isCommentExpanded && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsCommentExpanded(true); }}
                                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors mt-0.5"
                                        >
                                            See More
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {commentCount > 1 && (
                        <button
                            onClick={() => onViewComments && onViewComments(post)}
                            className="mt-2 text-xs text-[#64748b] hover:text-blue-500 transition-colors font-semibold flex items-center gap-1 group/viewall"
                        >
                            <span>View all {commentCount} comments</span>
                            <MessageCircle className="w-3 h-3 group-hover/viewall:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    );
}
