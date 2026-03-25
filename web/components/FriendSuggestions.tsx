'use client';

import { useState, useEffect } from 'react';
import { UserPlus, X, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import Link from 'next/link';
import { fixUrl } from '@/lib/utils';

interface MutualFriend {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

interface Suggestion {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    mutualFriendsCount: number;
    mutualFriends: MutualFriend[];
    friendsCount?: number;
}

export default function FriendSuggestions() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        // Load dismissed suggestions from localStorage
        const dismissed = localStorage.getItem('dismissedSuggestions');
        if (dismissed) {
            setDismissedIds(JSON.parse(dismissed));
        }
        fetchSuggestions();
    }, []);

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            // Try to get suggestions based on mutual friends first
            let response = await api.get('/suggestions/friends?limit=5');

            // If no mutual friend suggestions, get random suggestions
            if (response.data.length === 0) {
                response = await api.get('/suggestions/random?limit=5');
            }

            setSuggestions(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (userId: string) => {
        try {
            await api.post(`/friends/request/${userId}`);
            // Remove from suggestions after sending request
            setSuggestions(suggestions.filter(s => s.id !== userId));
        } catch (error) {
            console.error('Failed to send friend request:', error);
        }
    };

    const handleDismiss = (userId: string) => {
        const newDismissed = [...dismissedIds, userId];
        setDismissedIds(newDismissed);
        localStorage.setItem('dismissedSuggestions', JSON.stringify(newDismissed));
        setSuggestions(suggestions.filter(s => s.id !== userId));
    };

    const visibleSuggestions = suggestions.filter(s => !dismissedIds.includes(s.id));

    if (loading) {
        return (
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-[#334155] rounded-2xl p-4">
                <h3 className="text-lg font-bold text-white mb-4">Suggested for you</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#334155]" />
                            <div className="flex-1">
                                <div className="h-4 bg-[#334155] rounded w-24 mb-2" />
                                <div className="h-3 bg-[#334155] rounded w-32" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (visibleSuggestions.length === 0) {
        return null;
    }

    return (
        <div className="bg-[#0f172a]/20 backdrop-blur-3xl border border-white/5 rounded-2xl p-3 shadow-xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-1">
                Discover
            </h3>

            <div className="space-y-2">
                {visibleSuggestions.map((suggestion, idx) => (
                    <motion.div
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={suggestion.id}
                        className="flex items-center gap-2 group"
                    >
                        <Link href={`/profile/${suggestion.username}`} className="relative shrink-0">
                            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/5 group-hover:ring-blue-500/50 transition-all duration-300">
                                {suggestion.avatarUrl ? (
                                    <img
                                        src={fixUrl(suggestion.avatarUrl)}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-black text-[10px]">
                                        {(suggestion.displayName || suggestion.username)?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </Link>

                        <div className="flex-1 min-w-0">
                            <Link href={`/profile/${suggestion.username}`}>
                                <p className="text-xs text-white font-bold hover:text-blue-400 truncate transition-colors leading-tight">
                                    {suggestion.displayName || suggestion.username}
                                </p>
                            </Link>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                {suggestion.mutualFriendsCount > 0 ? `${suggestion.mutualFriendsCount} Mutual` : 'Mesh Node'}
                            </p>
                        </div>

                        <button
                            onClick={() => handleAddFriend(suggestion.id)}
                            className="w-7 h-7 flex items-center justify-center bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg transition-all duration-300 active:scale-95 group/btn"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                ))}
            </div>

            {visibleSuggestions.length > 0 && (
                <button
                    onClick={fetchSuggestions}
                    className="w-full mt-3 py-1.5 text-slate-600 hover:text-white text-[8px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/5 rounded-lg border border-white/5"
                >
                    Refresh
                </button>
            )}
        </div>
    );
}
