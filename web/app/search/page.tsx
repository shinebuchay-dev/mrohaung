'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, ArrowLeft, Users, FileText, UserPlus, X, User as UserIcon } from 'lucide-react';
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
                    {userResults.length > 0 && (
                        <section className="space-y-2">
                            <div className="flex items-center gap-2 mb-4 ml-1">
                                <Users className="w-4 h-4 text-blue-500" />
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">People</h2>
                            </div>
                            <div className="space-y-1">
                                {userResults.map((user, idx) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white dark:hover:bg-white/[0.03] transition-all group"
                                    >
                                        <Link href={`/profile/${user.username}`} className="shrink-0">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 ring-2 ring-transparent group-hover:ring-blue-500/30 transition-all">
                                                {user.avatarUrl ? (
                                                    <img 
                                                        src={fixUrl(user.avatarUrl)} 
                                                        alt={user.username} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs">
                                                        {(user.displayName || user.username)?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>

                                        <div className="flex-1 min-w-0">
                                            <Link href={`/profile/${user.username}`}>
                                                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100 hover:text-blue-500 transition-colors">
                                                    {user.displayName || user.username}
                                                </p>
                                            </Link>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-500">
                                                @{user.username}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAddFriend(user.id)}
                                                disabled={addedIds.includes(user.id)}
                                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                                                    addedIds.includes(user.id)
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                }`}
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                            </button>
                                            <Link
                                                href={`/profile/${user.username}`}
                                                className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-500 transition-all md:opacity-0 group-hover:opacity-100"
                                            >
                                                <UserIcon className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

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
