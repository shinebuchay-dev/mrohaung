'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, Share2, MessageCircle, Volume2, VolumeX, Plus, X, UploadCloud, Loader2, ChevronUp, ChevronDown, MoreVertical, Trash2, Flag } from 'lucide-react';
import api from '@/lib/api';
import { fixUrl } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

// --- TYPES ---
interface ShortVideo {
    id: string;
    videoUrl: string;
    title: string;
    description?: string;
    author: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
}

interface VideoComment {
    id: string;
    content: string;
    createdAt: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export default function ShortVideoPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const urlId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const [videos, setVideos] = useState<ShortVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    // Modals
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
    const [showOptions, setShowOptions] = useState(false);

    const activeVideo = videos.find(v => v.id === activeVideoId) || null;
    const isOwner = user && activeVideo && (user.id === activeVideo.author.id || user.username === activeVideo.author.username);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            setLoading(true);
            
            // If we have a specific ID from the URL, try to fetch it first to make sure it's at the top
            let initialVideos: ShortVideo[] = [];
            if (urlId) {
                try {
                    const res = await api.get(`/short-videos/${urlId}`);
                    if (res.data) {
                        initialVideos = [res.data];
                        setActiveVideoId(res.data.id);
                    }
                } catch (e) {
                    console.error('Failed to load specific video:', e);
                }
            }

            const res = await api.get('/short-videos/feed?limit=20');
            const feedVideos = res.data.videos || [];
            
            // Filter out the initial video if it's already in the feed to avoid duplicates
            const filteredFeed = feedVideos.filter((v: ShortVideo) => v.id !== urlId);
            const combined = [...initialVideos, ...filteredFeed];
            
            setVideos(combined);
            if (!activeVideoId && combined.length > 0) {
                setActiveVideoId(combined[0].id);
            }
        } catch (error) {
            console.error('Failed to load short videos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-scroll to specific video ID if requested
    useEffect(() => {
        if (!loading && urlId && videos.length > 0) {
            const element = document.getElementById(`video-${urlId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'auto' });
            }
        }
    }, [loading, urlId, videos.length]);

    const handleVideoInView = (id: string, isIntersecting: boolean) => {
        if (isIntersecting && window.location.pathname.startsWith('/short-video')) {
            setActiveVideoId(id);
            // Use browser history directly to avoid competing with Next.js router transitions
            const url = `/short-video/${id}`;
            if (window.location.pathname !== url) {
                window.history.replaceState(null, '', url);
            }
        }
    };

    const handleScrollUp = () => {
        const container = document.getElementById('video-feed-container');
        if (container) container.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
    };

    const handleScrollDown = () => {
        const container = document.getElementById('video-feed-container');
        if (container) container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    };

    return (
        <div className="flex flex-row h-[calc(100vh-96px)] w-full overflow-visible bg-transparent">
            
            {/* MAIN VIDEO AREA */}
            <div className="flex-1 min-w-0 relative h-full flex justify-center overflow-visible">

                {/* DYNAMIC LEFT ACTION COLUMN: ... options at top, Upload + Arrows at bottom */}
                <div className="hidden lg:flex flex-col items-center absolute inset-y-0 z-50 pointer-events-auto justify-between pb-6"
                     style={{ left: "calc(50% - ((100vh - 96px) * 9 / 32) - 64px)" }}>

                    {/* ⋯ Options button — top of column, same size as arrows */}
                    <div className="relative">
                        <button
                            onClick={() => setShowOptions(v => !v)}
                            className="w-10 h-10 bg-black/5 hover:bg-black/10 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 backdrop-blur-md rounded-full flex items-center justify-center transition-all text-slate-500 dark:text-slate-400 hover:text-blue-500 shadow-sm border border-slate-200/30 dark:border-white/5"
                            title="Options"
                        >
                            <MoreVertical className="w-5 h-5 stroke-[2]" />
                        </button>
                        <AnimatePresence>
                            {showOptions && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute left-0 top-12 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-white/10 overflow-hidden z-50"
                                >
                                    {isOwner && activeVideo && (
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Delete this short video?')) return;
                                                try {
                                                    await api.delete(`/short-videos/${activeVideo.id}`);
                                                    window.location.reload();
                                                } catch { alert('Failed to delete.'); }
                                                setShowOptions(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Video
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { alert('Report feature coming soon.'); setShowOptions(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <Flag className="w-4 h-4" />
                                        Report
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Arrows + Upload at bottom */}
                    <div className="flex flex-col items-center gap-4">
                        {user && (
                            <button
                                onClick={() => setIsUploadOpen(true)}
                                className="w-10 h-10 bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all text-blue-500 hover:scale-110 active:scale-95 shadow-sm border border-blue-500/30"
                                title="Upload Short Video"
                            >
                                <Plus className="w-5 h-5 stroke-[2.5]" />
                            </button>
                        )}
                        <button onClick={handleScrollUp} className="w-10 h-10 bg-black/5 hover:bg-black/10 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 backdrop-blur-md rounded-full flex items-center justify-center transition-all text-slate-500 dark:text-slate-400 hover:text-blue-500 shadow-sm border border-slate-200/30 dark:border-white/5">
                            <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                        </button>
                        <button onClick={handleScrollDown} className="w-10 h-10 bg-black/5 hover:bg-black/10 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 backdrop-blur-md rounded-full flex items-center justify-center transition-all text-slate-500 dark:text-slate-400 hover:text-blue-500 shadow-sm border border-slate-200/30 dark:border-white/5">
                            <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    </div>
                </div>

                {/* FEED CONTAINER (100% height, full width container but items inside will size themselves) */}
                <div id="video-feed-container" className="h-full w-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative bg-transparent flex flex-col items-center">

                    {loading && videos.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-50">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                        </div>
                    )}

                    {!loading && videos.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-10 text-center px-4">
                            <Plus className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                            <h2 className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-8">No videos yet</h2>
                            <button
                                onClick={() => setIsUploadOpen(true)}
                                className="bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-bold py-3 px-8 rounded-full text-sm transition-all"
                            >
                                Upload Video
                            </button>
                        </div>
                    )}

                    {videos.map((video) => (
                        <div key={video.id} id={`video-${video.id}`} className="w-full h-full shrink-0">
                            <VideoItem 
                                video={video} 
                                isActive={activeVideoId === video.id} 
                                onIntersect={(isIntersecting) => handleVideoInView(video.id, isIntersecting)}
                                onOpenComments={() => setCommentVideoId(prev => prev === video.id ? null : video.id)}
                            />
                        </div>
                    ))}
                </div>

                {/* Floating Upload Button (MOBILE FALLBACK ONLY) */}
                {user && (
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="lg:hidden absolute bottom-10 right-6 w-12 h-12 bg-black/40 dark:bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white hover:text-blue-400 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                    >
                        <Plus className="w-6 h-6 stroke-[2.5]" />
                    </button>
                )}
            </div>

            {/* DESKTOP SIDE PANEL SIBLING - Seamless UI (no border, transparent background to match main theme) */}
            <AnimatePresence>
                {commentVideoId && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 360, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="hidden lg:block shrink-0 h-full bg-transparent overflow-hidden"
                    >
                        <div className="w-[360px] h-full flex flex-col">
                            <CommentsContent 
                                videoId={commentVideoId} 
                                onClose={() => setCommentVideoId(null)} 
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MOBILE BOTTOM SHEET OVERLAY */}
            <AnimatePresence>
                {commentVideoId && (
                    <MobileCommentsOverlay 
                        videoId={commentVideoId} 
                        onClose={() => setCommentVideoId(null)} 
                    />
                )}
            </AnimatePresence>

            {/* Upload Modal overlay */}
            <AnimatePresence>
                {isUploadOpen && (
                    <UploadModal 
                        onClose={() => setIsUploadOpen(false)} 
                        onSuccess={() => {
                            setIsUploadOpen(false);
                            fetchFeed();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── SEAMLESS VIDEO ITEM COMPONENT (9:16 Ratio) ─────────────────────────────
function VideoItem({ video, isActive, onIntersect, onOpenComments }: { video: ShortVideo; isActive: boolean; onIntersect: (val: boolean) => void; onOpenComments: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [likeData, setLikeData] = useState({ isLiked: video.isLiked, count: video.likeCount });

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                onIntersect(entry.isIntersecting);
            });
        }, { threshold: 0.7 });

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [onIntersect]);

    useEffect(() => {
        if (!videoRef.current) return;
        
        if (isActive) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            if (videoRef.current.currentTime === videoRef.current.duration) {
                videoRef.current.currentTime = 0;
            }
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
        if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newIsLiked = !likeData.isLiked;
        setLikeData(prev => ({
            isLiked: newIsLiked,
            count: prev.count + (newIsLiked ? 1 : -1)
        }));

        try {
            await api.post(`/short-videos/${video.id}/like`);
        } catch (err) {
             setLikeData({ isLiked: video.isLiked, count: video.likeCount });
        }
    };

    const handleScrollUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        const container = document.getElementById('video-feed-container');
        if (container) container.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
    };

    const handleScrollDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        const container = document.getElementById('video-feed-container');
        if (container) container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/short-video/${video.id}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy link. Please try again.');
        });
    };

    return (
        // The outer snap container is exactly 100% height of the scroll port. No padding so it's a perfect fit.
        <div ref={containerRef} className="h-full w-full snap-start snap-always relative flex items-center justify-center p-0">


            {/* Strict 9:16 aspect ratio layout scaling correctly with height */}
            <div className="relative w-full h-full md:w-auto md:aspect-[9/16]">
                
                {/* The actual video box constrained cleanly, fully integrated, absolutely no standalone background/borders */}
                <div className="relative w-full h-full bg-transparent overflow-hidden rounded-none">
                    <video
                        ref={videoRef}
                        src={fixUrl(video.videoUrl)}
                    className="w-full h-full object-cover cursor-pointer"
                    loop
                    playsInline
                    muted={isMuted}
                    onClick={togglePlay}
                />

                <AnimatePresence>
                    {!isPlaying && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                        >
                            <Play className="w-16 h-16 text-white/50 fill-white/30 ml-2" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pure text/icon transparent overlay */}
                <button 
                    onClick={toggleMute}
                    className="absolute top-6 right-6 z-20 transition-all text-white/80 hover:text-white drop-shadow-md"
                >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>

                <div className="absolute bottom-0 left-0 w-full p-6 pt-32 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none flex items-end justify-between z-20">
                    
                    <div className="flex-1 min-w-0 pr-6 pointer-events-auto">
                        <div className="flex items-center gap-2 mb-3">
                            {video.author.avatarUrl ? (
                                <img src={fixUrl(video.author.avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/20" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/20">
                                    {(video.author.displayName || video.author.username)[0].toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col justify-center">
                                <h3 className="text-white font-bold text-[15px] tracking-wide drop-shadow-md select-none leading-tight">{video.author.displayName || video.author.username}</h3>
                                <span className="text-white/80 text-[11px] font-semibold tracking-wide drop-shadow-sm leading-tight">@{video.author.username}</span>
                            </div>
                        </div>
                        <h2 className="text-white text-sm font-semibold mb-1 line-clamp-2 drop-shadow-md">{video.title}</h2>
                        {video.description && (
                            <p className="text-white/80 text-xs font-medium line-clamp-2 drop-shadow-sm">{video.description}</p>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-6 pointer-events-auto pb-2">
                        <button onClick={handleLike} className="flex flex-col items-center gap-1.5 group">
                            <Heart className={`w-6 h-6 transition-all active:scale-90 ${likeData.isLiked ? 'text-rose-500 fill-rose-500' : 'text-white drop-shadow-md group-hover:scale-110'}`} />
                            <span className="text-white font-bold text-[11px] drop-shadow-md tracking-wider">{likeData.count}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onOpenComments(); }} className="flex flex-col items-center gap-1.5 group">
                            <MessageCircle className="w-6 h-6 text-white drop-shadow-md group-hover:scale-110 active:scale-90 transition-all" />
                            <span className="text-white font-bold text-[11px] drop-shadow-md tracking-wider">{video.commentCount || 0}</span>
                        </button>
                        <button onClick={handleShare} className="flex flex-col items-center gap-1.5 group">
                            <Share2 className="w-6 h-6 text-white drop-shadow-md group-hover:scale-110 active:scale-90 transition-all" />
                            <span className="text-white font-bold text-[11px] drop-shadow-md tracking-wider">Share</span>
                        </button>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}

// ─── COMMENTS CONTENT (Shared) ──────────────────────────────────────────────
function CommentsContent({ videoId, onClose }: { videoId: string, onClose: () => void }) {
    const { user, requireAuth } = useAuth();
    const [comments, setComments] = useState<VideoComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/short-videos/${videoId}/comments`);
            setComments(res.data || []);
        } catch (err) {
            console.error('Failed to load comments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [videoId]);

    const handlePost = () => {
        requireAuth(async () => {
            if (!inputText.trim() || submitting) return;
            try {
                setSubmitting(true);
                const res = await api.post(`/short-videos/${videoId}/comments`, { content: inputText.trim() });
                setComments(prev => [res.data, ...prev]);
                setInputText('');
            } catch (err) {
                console.error('Post comment failed:', err);
            } finally {
                setSubmitting(false);
            }
        });
    };

    return (
        <div className="w-full h-full flex flex-col bg-transparent">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 md:py-6 shrink-0">
                <div className="flex items-center gap-3">
                    <MessageCircle className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Comments <span className="text-slate-400 text-sm ml-1 font-semibold">{comments.length}</span></h3>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors active:scale-95">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                ) : comments.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {comments.map((comment) => (
                            <div key={comment.id} className="p-4 px-6 flex gap-3 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                <div className="shrink-0 pt-0.5">
                                    {comment.avatarUrl ? (
                                        <img src={fixUrl(comment.avatarUrl)} className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200/50 dark:ring-white/10" alt="" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                            {(comment.displayName || comment.username)[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{comment.displayName || comment.username}</h4>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium break-words">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-transparent">
                        <MessageCircle className="w-10 h-10 text-slate-100 dark:text-slate-800 mb-2" />
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">Be the first to comment on this moment.</p>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-transparent shrink-0">
                <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-full py-2.5 px-5 border border-slate-200/50 dark:border-white/10 focus-within:border-blue-500/50 dark:focus-within:border-blue-500/50 transition-colors shadow-sm">
                    <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                        className="bg-transparent border-none outline-none flex-1 text-sm md:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 px-0"
                    />
                    <button 
                        onClick={handlePost}
                        disabled={!inputText.trim() || submitting}
                        className="text-blue-600 dark:text-blue-400 font-bold tracking-wide text-sm px-2 hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MOBILE COMMENTS BOTTOM SHEET ───────────────────────────────────────────
function MobileCommentsOverlay({ videoId, onClose }: { videoId: string, onClose: () => void }) {
    return (
        <React.Fragment>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="lg:hidden absolute inset-0 z-40 bg-black/10 dark:bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="lg:hidden absolute left-0 right-0 bottom-0 h-[75vh] w-full z-50 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[32px] overflow-hidden bg-white dark:bg-[#0f172a]"
            >
                <div className="flex justify-center pt-4 pb-2 bg-white dark:bg-[#0f172a] shrink-0">
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <CommentsContent videoId={videoId} onClose={onClose} />
                </div>
            </motion.div>
        </React.Fragment>
    );
}

// ─── FLAT/SEAMLESS UPLOAD MODAL ─────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const MAX_DURATION_SECONDS = 120; // 2 minutes

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        // Check duration using a temporary video element
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = URL.createObjectURL(selected);
        tempVideo.onloadedmetadata = () => {
            URL.revokeObjectURL(tempVideo.src);
            if (tempVideo.duration > MAX_DURATION_SECONDS) {
                setError(`Video is too long (${Math.round(tempVideo.duration)}s). Maximum is 2 minutes (120s).`);
                setFile(null);
                e.target.value = '';
            } else {
                setError('');
                setFile(selected);
            }
        };
    };

    const handleUpload = async () => {
        if (!file) return setError('Select a video file.');
        if (!title.trim()) return setError('Add a title.');

        setError('');
        setLoading(true);

        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('description', description);

        try {
            await api.post('/short-videos', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Upload failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={!loading ? onClose : undefined}
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            />

            <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.97 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">New Short Video</h2>
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                            <p className="text-red-500 font-semibold text-sm">{error}</p>
                        </div>
                    )}

                    {/* File picker */}
                    <div>
                        <input type="file" id="video-upload" accept="video/mp4,video/quicktime,video/x-quicktime,video/mov,video/webm,.mov" className="hidden" onChange={handleFileChange} disabled={loading} />
                        <label 
                            htmlFor="video-upload"
                            className="flex flex-col items-center justify-center w-full py-10 cursor-pointer rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all"
                        >
                            {file ? (
                                <div className="text-center">
                                    <Play className="w-10 h-10 fill-blue-500 text-blue-500 mx-auto mb-2" />
                                    <p className="text-slate-800 dark:text-white font-bold text-base px-4 line-clamp-1">{file.name}</p>
                                    <p className="text-slate-400 text-xs mt-1">Click to change</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <UploadCloud className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-slate-500 dark:text-slate-400 font-semibold text-base">Select video</p>
                                    <p className="text-slate-400 dark:text-slate-600 text-xs mt-1">MP4, MOV, WebM · max 2 minutes</p>
                                </div>
                            )}
                        </label>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Title <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            placeholder="Give your video a title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={loading}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-base font-medium text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all disabled:opacity-50"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Description <span className="text-slate-300">(Optional)</span></label>
                        <textarea
                            placeholder="Add a description..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all disabled:opacity-50 resize-none"
                        />
                    </div>
                </div>

                {/* Submit */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button
                        onClick={handleUpload}
                        disabled={loading || !file || !title.trim()}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-white/5 text-white disabled:text-slate-400 dark:disabled:text-slate-600 font-bold text-sm py-3.5 rounded-xl transition-all disabled:cursor-not-allowed tracking-wide"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Publishing...
                            </span>
                        ) : 'Publish Video'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

