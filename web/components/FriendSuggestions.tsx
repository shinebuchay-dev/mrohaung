'use client';

import { useState, useEffect } from 'react';
import { UserPlus, X, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import Link from 'next/link';
import { fixUrl } from '@/lib/utils';

interface Suggestion {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    isVerified?: boolean;
    mutualFriendsCount: number;
    friendsCount?: number;
}

export default function FriendSuggestions() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [addedIds, setAddedIds] = useState<string[]>([]);

    useEffect(() => {
        const dismissed = localStorage.getItem('dismissedSuggestions');
        if (dismissed) setDismissedIds(JSON.parse(dismissed));
        fetchSuggestions();
    }, []);

    const fetchSuggestions = async () => {
        try {
            setIsRefreshing(true);
            setLoading(true);
            let response = await api.get('/suggestions/friends?limit=5');
            if (response.data.length === 0) {
                response = await api.get('/suggestions/random?limit=5');
            }
            setSuggestions(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleAddFriend = async (userId: string) => {
        try {
            await api.post(`/friends/request/${userId}`);
            setAddedIds(prev => [...prev, userId]);
            setTimeout(() => {
                setSuggestions(prev => prev.filter(s => s.id !== userId));
                setAddedIds(prev => prev.filter(id => id !== userId));
            }, 800);
        } catch (error) {
            console.error('Failed to send friend request:', error);
        }
    };

    const handleDismiss = (userId: string) => {
        const newDismissed = [...dismissedIds, userId];
        setDismissedIds(newDismissed);
        localStorage.setItem('dismissedSuggestions', JSON.stringify(newDismissed));
        setSuggestions(prev => prev.filter(s => s.id !== userId));
    };

    const visibleSuggestions = suggestions.filter(s => !dismissedIds.includes(s.id));

    if (loading) {
        return (
            <div className="rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suggested for you</p>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse flex items-center gap-3 px-1">
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                                <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (visibleSuggestions.length === 0) return null;

    return (
        <div className="rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Suggested for you
                </p>
                <button
                    onClick={fetchSuggestions}
                    disabled={isRefreshing}
                    className="text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* List */}
            <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                    {visibleSuggestions.map((suggestion, idx) => (
                        <motion.div
                            key={suggestion.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.18, delay: idx * 0.04 }}
                            className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
                        >
                            {/* Avatar */}
                            <Link href={`/profile/${suggestion.username}`} className="shrink-0">
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 ring-2 ring-transparent group-hover:ring-blue-500/30 transition-all">
                                    {suggestion.avatarUrl ? (
                                        <img
                                            src={fixUrl(suggestion.avatarUrl)}
                                            alt={suggestion.username}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-sm text-slate-600 dark:text-slate-300">
                                            {(suggestion.displayName || suggestion.username)?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </Link>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <Link href={`/profile/${suggestion.username}`}>
                                    <div className="flex items-center gap-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                                            {suggestion.displayName || suggestion.username}
                                        </p>
                                        {suggestion.isVerified && (
                                            <div className="flex-shrink-0 ml-[4px] flex items-center justify-center bg-amber-500 rounded-full w-[11.5px] h-[11.5px] mt-[1.5px]">
                                                <Check className="w-[5.5px] h-[5.5px] text-white" strokeWidth={5} />
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                    {suggestion.mutualFriendsCount > 0
                                        ? `${suggestion.mutualFriendsCount} mutual friend${suggestion.mutualFriendsCount > 1 ? 's' : ''}`
                                        : 'People you may know'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => handleAddFriend(suggestion.id)}
                                    disabled={addedIds.includes(suggestion.id)}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                                        addedIds.includes(suggestion.id)
                                            ? 'bg-green-500 text-white'
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                    title="Add Friend"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDismiss(suggestion.id)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                                    title="Dismiss"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="mt-3 px-2">
                <Link
                    href="/friends"
                    className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    See all suggestions →
                </Link>
            </div>
        </div>
    );
}
