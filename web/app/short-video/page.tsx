'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, Share2, MessageCircle, Volume2, VolumeX, Plus, X, UploadCloud, Loader2 } from 'lucide-react';
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
    isLiked: boolean;
}

export default function ShortVideoPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [videos, setVideos] = useState<ShortVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    // Upload Modal State
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            setLoading(true);
            const res = await api.get('/short-videos/feed?limit=20');
            setVideos(res.data.videos || []);
            if (res.data.videos?.length > 0) {
                setActiveVideoId(res.data.videos[0].id);
            }
        } catch (error) {
            console.error('Failed to load short videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVideoInView = (id: string, isIntersecting: boolean) => {
        if (isIntersecting) {
            setActiveVideoId(id);
        }
    };

    return (
        // Completely seamless wrapper - Integrated into the body theme directly
        <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden flex justify-center bg-transparent">
            {/* Full height snap scroll - NO BOX, NO BORDERS, NO WIDTH LIMITS FOR THE FEED ITSELF, NO SCROLLBAR */}
            <div className="h-full w-full max-w-[500px] snap-y snap-mandatory overflow-y-scroll scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative bg-transparent">
                
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
                    <VideoItem 
                        key={video.id} 
                        video={video} 
                        isActive={activeVideoId === video.id} 
                        onIntersect={(isIntersecting) => handleVideoInView(video.id, isIntersecting)}
                    />
                ))}
            </div>

            {/* Seamless Absolute Upload Button directly floating */}
            {user && (
                <button
                    onClick={() => setIsUploadOpen(true)}
                    className="absolute bottom-10 right-10 w-12 h-12 bg-transparent text-slate-400 hover:text-blue-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
                >
                    <Plus className="w-8 h-8 stroke-[2]" />
                </button>
            )}

            {/* Flat Full-screen overlay Modal */}
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

// ─── SEAMLESS VIDEO ITEM COMPONENT ──────────────────────────────────────────
function VideoItem({ video, isActive, onIntersect }: { video: ShortVideo; isActive: boolean; onIntersect: (val: boolean) => void }) {
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

    return (
        // NO backgrounds, NO borders. Uses object-contain/cover seamlessly blending with main app theme.
        <div ref={containerRef} className="h-full w-full snap-start snap-always relative flex items-center justify-center p-0 md:p-4">
            
            <div className="relative w-full h-full bg-black/5 dark:bg-black/20 md:rounded-[32px] overflow-hidden">
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

                {/* Pure text/icon transparent overlay without box wrappers */}
                <button 
                    onClick={toggleMute}
                    className="absolute top-6 right-6 z-20 transition-all text-white/80 hover:text-white"
                >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>

                <div className="absolute bottom-0 left-0 w-full p-6 pt-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none flex items-end justify-between z-20">
                    
                    <div className="flex-1 min-w-0 pr-6 pointer-events-auto">
                        <div className="flex items-center gap-2 mb-2">
                            {video.author.avatarUrl ? (
                                <img src={fixUrl(video.author.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover border border-white/20" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/20">
                                    {(video.author.displayName || video.author.username)[0].toUpperCase()}
                                </div>
                            )}
                            <h3 className="text-white font-bold text-sm tracking-wide">@{video.author.username}</h3>
                        </div>
                        <h2 className="text-white text-sm font-semibold mb-1 line-clamp-2">{video.title}</h2>
                        {video.description && (
                            <p className="text-white/70 text-xs line-clamp-2">{video.description}</p>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-6 pointer-events-auto pb-2">
                        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                            <Heart className={`w-8 h-8 transition-colors ${likeData.isLiked ? 'text-rose-500 fill-rose-500' : 'text-white/80 group-hover:text-white'}`} />
                            <span className="text-white/90 font-bold text-[11px]">{likeData.count}</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 group">
                            <MessageCircle className="w-8 h-8 text-white/80 group-hover:text-white transition-colors" />
                            <span className="text-white/90 font-bold text-[11px]">0</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 group">
                            <Share2 className="w-8 h-8 text-white/80 group-hover:text-white transition-colors" />
                            <span className="text-white/90 font-bold text-[11px]">Share</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── FLAT/SEAMLESS UPLOAD MODAL ─────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
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
        // Completely flat backdrop blur blending into the app
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={!loading ? onClose : undefined}
                className="absolute inset-0 bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-xl"
            />

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 20 }}
                // Removing card borders/shadows/backgrounds for ultra-minimal look
                className="relative w-full h-full md:h-auto max-w-lg bg-transparent flex flex-col p-6 md:p-8"
            >
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">New Video</h2>
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 space-y-8 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-24 md:pb-0">
                    {error && (
                        <p className="text-red-500 font-bold text-sm bg-transparent">{error}</p>
                    )}

                    {/* Minimal Transparent Dropzone */}
                    <div>
                        <input type="file" id="video-upload" accept="video/mp4,video/mov,video/webm" className="hidden" onChange={handleFileChange} disabled={loading} />
                        <label 
                            htmlFor="video-upload"
                            className="flex flex-col items-center justify-center w-full py-12 cursor-pointer transition-all hover:opacity-70"
                        >
                            {file ? (
                                <div className="text-center">
                                    <Play className="w-10 h-10 fill-blue-500 text-blue-500 mx-auto mb-2" />
                                    <p className="text-slate-800 dark:text-white font-bold text-lg">{file.name}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <UploadCloud className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-slate-400 dark:text-slate-500 font-bold text-lg">Select video</p>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <input
                                type="text"
                                placeholder="Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={loading}
                                // Seamless input: NO borders, big text, just a bottom line if needed, or totally transparent
                                className="w-full bg-transparent border-none outline-none text-2xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:ring-0 p-0 disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <textarea
                                placeholder="Description (Optional)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={loading}
                                rows={2}
                                className="w-full bg-transparent border-none outline-none text-base font-medium text-slate-600 dark:text-slate-400 placeholder-slate-300 dark:placeholder-slate-700 focus:ring-0 p-0 disabled:opacity-50 resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6">
                    <button
                        onClick={handleUpload}
                        disabled={loading || !file || !title.trim()}
                        className="w-full text-center text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:text-slate-300 dark:disabled:text-slate-700 font-black text-lg transition-colors py-4 uppercase tracking-widest disabled:cursor-not-allowed"
                    >
                        {loading ? 'Publishing...' : 'Publish'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
