import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, Heart, MoreHorizontal, Edit2, Trash2, Play, Square, ThumbsUp, X, Check } from 'lucide-react';
import api from '@/lib/api';
import { formatRelativeTime, fixUrl } from '@/lib/utils';
import Link from 'next/link';

// Audio Player Component
const AudioCommentPlayer = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);

    return (
        <div className="flex items-center gap-2 mt-2 bg-[#334155]/40 p-2 pr-4 rounded-xl w-fit border border-slate-200 dark:border-[#334155]/30">
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

interface CommentItemProps {
    comment: any;
    allComments: any[];
    currentUserId?: string;
    depth?: number;
    onDelete?: (id: string) => void;
    onUpdate?: (id: string, content: string) => void;
}

function CommentItem({ comment, allComments, currentUserId, depth = 0, onDelete, onUpdate }: CommentItemProps) {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Edit/Delete/Like State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content || '');
    const [saving, setSaving] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [liked, setLiked] = useState(!!comment.isLiked);
    const [likeCount, setLikeCount] = useState(comment._count?.likes || comment.likeCount || 0);

    const editRef = useRef<HTMLTextAreaElement>(null);

    // Filter direct children
    const replies = allComments.filter(c => c.parentId === comment.id);
    replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const isOwnComment = currentUserId === (comment.user?.id || comment.userId);

    useEffect(() => {
        if (isEditing && editRef.current) {
            editRef.current.style.height = 'auto';
            editRef.current.style.height = editRef.current.scrollHeight + 'px';
        }
    }, [editContent, isEditing]);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setSubmitting(true);
        try {
            await api.post(`/posts/${comment.postId}/comment`, {
                content: replyText,
                parentId: comment.id
            });
            setReplyText('');
            setShowReplyInput(false);
        } catch (error) {
            console.error('Failed to reply:', error);
            alert('Failed to send reply');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLike = async () => {
        if (!currentUserId) {
            alert('Please login to like comments!');
            return;
        }
        const newLiked = !liked;
        const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

        setLiked(newLiked);
        setLikeCount(newCount);

        try {
            await api.post(`/comments/${comment.id}/like`, { type: 'like' });
        } catch (error) {
            console.error('Failed to like comment:', error);
            setLiked(!newLiked);
            setLikeCount(likeCount);
        }
    };

    const handleSaveEdit = async () => {
        if (!editContent.trim()) return;
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
        try {
            await api.delete(`/comments/${comment.id}`);
            if (onDelete) onDelete(comment.id);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('Failed to delete comment');
        }
    };

    return (
        <div id={`comment-${comment.id}`} className={`flex flex-col w-full gap-2 ${depth > 0 ? 'mt-3' : ''} transition-colors duration-1000 rounded-2xl`}>
            <div className="flex items-start gap-3 relative group">
                <Link href={`/profile/${comment.user?.username}`} className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 bg-cover bg-center border border-slate-200 dark:border-white/5" style={{ backgroundImage: comment.user?.avatarUrl ? `url(${fixUrl(comment.user.avatarUrl)})` : undefined }}>
                        {!comment.user?.avatarUrl && (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                                {(comment.user?.displayName || comment.user?.username)?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                </Link>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                        <div className="w-full min-w-0 relative group/bubble">
                            <div className="flex items-center gap-[4px] mb-0.5 mt-0.5">
                                <Link href={`/profile/${comment.user?.username}`} className="text-[13px] font-black text-slate-900 dark:text-white hover:underline leading-tight underline-offset-2">
                                    {comment.user?.displayName || comment.user?.username}
                                </Link>
                                {comment.user?.isVerified && (
                                    <div className="flex-shrink-0 flex items-center justify-center bg-amber-500 rounded-full w-[11px] h-[11px] mt-[1px]">
                                        <Check className="w-[6px] h-[6px] text-white" strokeWidth={6} />
                                    </div>
                                )}

                                {isOwnComment && !isEditing && (
                                    <div className="relative inline-flex items-center">
                                        <AnimatePresence mode="wait">
                                            {!showMenu ? (
                                                <motion.button
                                                    key="more"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setShowMenu(true)}
                                                    className="opacity-0 group-hover/bubble:opacity-100 p-1 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-blue-400"
                                                >
                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                </motion.button>
                                            ) : (
                                                <motion.div
                                                    key="actions"
                                                    initial={{ opacity: 0, x: -5 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -5 }}
                                                    className="flex items-center gap-2 ml-1"
                                                >
                                                    <button 
                                                        onClick={() => { setShowMenu(false); setIsEditing(true); }} 
                                                        className="text-[11px] font-medium text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                        <span>Edit</span>
                                                    </button>
                                                    <div className="w-[1px] h-2 bg-slate-200 dark:bg-white/10" />
                                                    <button 
                                                        onClick={() => { setShowMenu(false); handleDelete(); }} 
                                                        className="text-[11px] font-medium text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        <span>Delete</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setShowMenu(false)}
                                                        className="ml-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <textarea
                                        ref={editRef}
                                        value={editContent}
                                        onChange={(e) => {
                                            setEditContent(e.target.value);
                                            const el = editRef.current;
                                            if (el) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                            }
                                        }}
                                        className="w-full bg-transparent border-none p-0 text-[14px] text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-0 overflow-hidden font-medium"
                                        rows={1}
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-50 dark:border-white/5">
                                        <button onClick={() => setIsEditing(false)} className="text-[10px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-[0.2em] transition-colors">Cancel</button>
                                        <button onClick={handleSaveEdit} disabled={saving} className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-[0.2em] transition-all">
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-1">
                                    {comment.audioUrl ? (
                                        <AudioCommentPlayer src={fixUrl(comment.audioUrl)!} />
                                    ) : (
                                        <p className="text-[14px] text-slate-800 dark:text-slate-200 leading-normal whitespace-pre-wrap break-words">
                                            {comment.content}
                                        </p>
                                    )}
                                    {comment.stickerUrl && <img src={fixUrl(comment.stickerUrl)} alt="Sticker" className="w-20 h-20 object-contain mt-1" />}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        {!isEditing && (
                            <div className="flex items-center gap-4 mt-0.5 ml-2">
                                <span className="text-[10px] text-slate-500 font-medium">
                                    {formatRelativeTime(comment.createdAt)}
                                </span>
                                <button
                                    onClick={handleLike}
                                    className={`text-[11px] font-bold transition-colors flex items-center gap-1 ${liked ? 'text-blue-500' : 'text-slate-400 hover:text-blue-400'}`}
                                >
                                    Like {likeCount > 0 && <span className="text-[10px] opacity-70">({likeCount})</span>}
                                </button>
                                {currentUserId && (
                                    <button
                                        onClick={() => setShowReplyInput(!showReplyInput)}
                                        className="text-[11px] font-bold text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                        Reply
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Nested Reply Input */}
                    <AnimatePresence>
                        {showReplyInput && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleReplySubmit}
                                className="mt-2 flex items-center gap-2 overflow-hidden"
                            >
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={`Reply to ${comment.user?.displayName || comment.user?.username}...`}
                                    className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all rounded-full px-4 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500/50 placeholder-slate-500"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!replyText.trim() || submitting}
                                    className="p-1.5 bg-blue-600 rounded-full text-white disabled:opacity-50 hover:bg-blue-500 transition-colors"
                                >
                                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Recursively Render Replies */}
            {replies.length > 0 && (
                <div className="pl-3 ml-3 border-l-2 border-slate-200 dark:border-[#334155]/30 space-y-3">
                    {replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            allComments={allComments}
                            currentUserId={currentUserId}
                            depth={depth + 1}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CommentSection({ comments, currentUserId, postId, onDelete, onUpdate }: { comments: any[], currentUserId?: string, postId: string, onDelete?: (id: string) => void, onUpdate?: (id: string, content: string) => void }) {
    // Only render top-level comments here
    const rootComments = comments.filter(c => !c.parentId);

    // We can define handlers here if we want to bubble up, but simpler to use socket updates from parent
    // However, for immediate optimistic UI updates, we could pass handlers.
    // For now, let's rely on socket/parent updates or local state if possible.
    // Actually, PostModal manages the `comments` state.
    // If we want to support Delete/Update, we need to affect `comments` in PostModal?
    // PostModal passes `comments`. We can't change it here easily without a callback.
    // But wait, the original `CommentItem` in `PostModal` called `onUpdate`/`onDelete`.
    // We should probably accept those props in `CommentSection` too?

    // Changing props involves changing usage in `PostModal`. 
    // Let's modify `CommentSection` to accept `onUpdate` and `onDelete`?
    // But `PostModal` usage currently is:
    // <CommentSection comments={comments} currentUserId={currentUserId} postId={post.id} />

    // I can stick to internal API calls for now, and socket updates will refresh the list (handled in PostModal).
    // The previous CommentItem implementation in PostModal did:
    // `if (onDelete) onDelete(comment.id);` -> which updated local state.
    // If I don't update local state, it might look laggy until socket event arrives.
    // But socket event is usually fast.

    return (
        <div className="space-y-4">
            {rootComments.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-slate-500 text-sm">No comments yet. Be the first to say something!</p>
                </div>
            ) : (
                rootComments.map(comment => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        allComments={comments}
                        currentUserId={currentUserId}
                        depth={0}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                    />
                ))
            )}
        </div>
    );
}
