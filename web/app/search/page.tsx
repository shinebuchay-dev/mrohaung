'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, ArrowLeft, Users, FileText, UserPlus, X, User as UserIcon, Check, UserCheck } from 'lucide-react';
import api from '@/lib/api';
import { fixUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import PostCard from '@/components/PostCard';

interface UserResult {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    email?: string;
    isFriend?: boolean;
    isRequestSent?: boolean;
}

import { Suspense } from 'react';

function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || '';
    const [userResults, setUserResults] = useState<UserResult[]>([]);
    const [postResults, setPostResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [addedIds, setAddedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!query.trim()) return;

        const performSearch = async () => {
            setLoading(true);
            try {
                const [usersRes, postsRes] = await Promise.all([
                    api.get(`/profile/search?q=${encodeURIComponent(query)}`),
                    api.get(`/posts/search?q=${encodeURIComponent(query)}`)
                ]);
                
                setUserResults(usersRes.data || []);
                setPostResults(postsRes.data || []);
            } catch (err: any) {
                console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [query]);

    const handleAddFriend = async (userId: string) => {
        try {
            await api.post(`/friends/request/${userId}`);
            setAddedIds(prev => [...prev, userId]);
        } catch (error) {
            console.error('Failed to send friend request:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="mt-4 text-slate-500 font-medium">Searching...</p>
            </div>
        );
    }

    const hasResults = userResults.length > 0 || postResults.length > 0;

    return (
        <div className="pb-20">
            {/* Header - Repositioned to be closer to where search bar was */}
            <div className="mb-8 pt-2">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Search results for</h1>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">"{query}"</span>
                    </div>
                </div>
            </div>

            {!hasResults ? (
                <EmptyState query={query} />
            ) : (
                <div className="space-y-12">
                    {/* Users Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 ml-1">
                                <Users className="w-4 h-4 text-blue-500" />
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">People</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userResults.map((user, idx) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="group bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 rounded-2xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.02] hover:shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                onClick={() => router.push(`/profile/${user.username}`)}
                                                className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer relative flex-shrink-0"
                                            >
                                                {user.avatarUrl ? (
                                                    <img 
                                                        src={fixUrl(user.avatarUrl)} 
                                                        alt={user.username} 
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 uppercase">
                                                        {(user.displayName || user.username)?.[0]}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h3 
                                                    onClick={() => router.push(`/profile/${user.username}`)}
                                                    className="font-bold text-slate-900 dark:text-white text-[15px] truncate group-hover:text-blue-500 transition-colors mb-2 cursor-pointer"
                                                >
                                                    {user.displayName || user.username}
                                                </h3>
                                                
                                                <div className="flex items-center gap-2">
                                                    {(addedIds.includes(user.id) || user.isRequestSent) ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-lg font-bold text-[10px]">
                                                            <Check className="w-3 h-3" />
                                                            Sent
                                                        </div>
                                                    ) : user.isFriend ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-[10px]">
                                                            <UserCheck className="w-3 h-3" />
                                                            Friends
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddFriend(user.id)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] transition-all active:scale-95 shadow-sm shadow-blue-500/10"
                                                        >
                                                            <UserPlus className="w-3 h-3" />
                                                            Add Friend
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>

                    {/* Separator */}
                    {userResults.length > 0 && postResults.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-white/5" />
                    )}

                    {/* Posts Section */}
                    {postResults.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 mb-4 ml-1">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Related Posts</h2>
                            </div>
                            <div className="space-y-6">
                                {postResults.map((post) => (
                                    <PostCard 
                                        key={post.id} 
                                        post={post}
                                        hideComments={true}
                                        onViewComments={(p) => router.push(`/?post=${p.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="mt-4 text-slate-500 font-medium">Loading search results...</p>
            </div>
        }>
            <SearchResults />
        </Suspense>
    );
}

function EmptyState({ query }: { query: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No results found</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs text-xs">We couldn't find anything matching "{query}".</p>
        </div>
    );
}
