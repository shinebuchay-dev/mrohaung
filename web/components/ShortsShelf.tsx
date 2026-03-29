'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, ChevronRight, Check } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { fixUrl } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ShortVideo {
    id: string;
    title?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    views: number;
    author: {
        username: string;
        avatarUrl?: string;
        displayName?: string;
        isVerified?: boolean;
    };
}

export default function ShortsShelf() {
    const [shorts, setShorts] = useState<ShortVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchShorts = async () => {
        try {
            const response = await api.get('/short-videos/feed?limit=10');
            setShorts(response.data.videos || []);
        } catch (error) {
            console.error('Failed to fetch shorts for shelf:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShorts();
    }, []);

    if (loading && shorts.length === 0) {
        return (
            <div className="mb-8 overflow-hidden">
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-md animate-pulse" />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-shrink-0 w-[140px] aspect-[9/16] rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!loading && shorts.length === 0) return null;

    return (
        <div className="mb-8 group">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <Play className="w-4 h-4 text-rose-500 fill-rose-500" />
                    </div>
                    <h2 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight uppercase">Shorts</h2>
                </div>
                <Link 
                    href="/short-video" 
                    className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
                >
                    View All <ChevronRight className="w-3 h-3" />
                </Link>
            </div>

            <div 
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-0.5 snap-x snap-mandatory"
            >
                {shorts.map((video) => (
                    <motion.div
                        key={video.id}
                        whileHover={{ y: -4 }}
                        className="flex-shrink-0 w-[150px] sm:w-[180px] snap-start"
                    >
                        <Link href={`/short-video/${video.id}`}>
                            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 shadow-lg shadow-black/5 ring-1 ring-black/5 dark:ring-white/10 group/card">
                                {video.thumbnailUrl ? (
                                    <img 
                                        src={fixUrl(video.thumbnailUrl)} 
                                        alt={video.title || ''} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                        <Play className="w-8 h-8 text-white/20" />
                                    </div>
                                )}

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 p-3 flex flex-col justify-end">
                                    <p className="text-white text-[13px] font-bold leading-tight line-clamp-2 mb-2 drop-shadow-sm">
                                        {video.title || 'Short Video'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                                            {video.author.avatarUrl ? (
                                                <img src={fixUrl(video.author.avatarUrl)} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-600 flex items-center justify-center text-[8px] text-white">
                                                    {video.author.username[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                            <span className="text-[10px] text-white/80 font-semibold truncate">@{video.author.username}</span>
                                            {video.author.isVerified && (
                                                <div className="flex-shrink-0 flex items-center justify-center bg-amber-500 rounded-full w-[10px] h-[10px]">
                                                    <Check className="w-[5px] h-[5px] text-white" strokeWidth={6} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* View Count */}
                                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded-md border border-white/10 flex items-center gap-1">
                                    <Play className="w-2 h-2 text-white fill-white" />
                                    <span className="text-[9px] text-white font-black">{video.views}</span>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
                
                {/* View More Card */}
                <Link href="/short-video" className="flex-shrink-0 w-[150px] sm:w-[180px] snap-start">
                    <div className="w-full aspect-[9/16] rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-3 group/more hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-md group-hover/more:scale-110 transition-transform">
                            <ChevronRight className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">View More</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
