'use client';

import { useState, useEffect } from 'react';
import { UserPlus, X, Users } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

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

            setSuggestions(response.data);
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
        <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-[#334155] rounded-2xl p-4">
            <h3 className="text-lg font-bold text-white mb-4">Suggested for you</h3>
            <div className="space-y-3">
                {visibleSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="flex items-start gap-3 group">
                        <Link href={`/profile/${suggestion.id}`}>
                            {suggestion.avatarUrl ? (
                                <img
                                    src={suggestion.avatarUrl}
                                    alt={suggestion.displayName || suggestion.username || ''}
                                    className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 cursor-pointer hover:opacity-80 transition-opacity" />
                            )}
                        </Link>

                        <div className="flex-1 min-w-0">
                            <Link href={`/profile/${suggestion.id}`}>
                                <p className="text-white font-medium text-sm hover:underline cursor-pointer truncate">
                                    {suggestion.displayName || suggestion.username}
                                </p>
                            </Link>

                            {suggestion.mutualFriendsCount > 0 ? (
                                <div className="flex items-center gap-1 text-xs text-[#64748b] mt-0.5">
                                    <Users className="w-3 h-3" />
                                    <span>
                                        {suggestion.mutualFriendsCount} mutual friend{suggestion.mutualFriendsCount > 1 ? 's' : ''}
                                    </span>
                                </div>
                            ) : suggestion.friendsCount !== undefined && (
                                <p className="text-xs text-[#64748b] mt-0.5">
                                    {suggestion.friendsCount} friends
                                </p>
                            )}

                            {suggestion.mutualFriends && suggestion.mutualFriends.length > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    {suggestion.mutualFriends.slice(0, 3).map((friend) => (
                                        <div key={friend.id} className="relative group/avatar">
                                            {friend.avatarUrl ? (
                                                <img
                                                    src={friend.avatarUrl}
                                                    alt={friend.displayName || friend.username || ''}
                                                    className="w-5 h-5 rounded-full border border-[#1e293b]"
                                                    title={friend.displayName || friend.username}
                                                />
                                            ) : (
                                                <div
                                                    className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border border-[#1e293b]"
                                                    title={friend.displayName || friend.username}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleAddFriend(suggestion.id)}
                                className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Add friend"
                            >
                                <UserPlus className="w-4 h-4 text-blue-500" />
                            </button>
                            <button
                                onClick={() => handleDismiss(suggestion.id)}
                                className="p-1.5 hover:bg-[#334155] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Dismiss"
                            >
                                <X className="w-4 h-4 text-[#64748b]" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {visibleSuggestions.length > 0 && (
                <button
                    onClick={fetchSuggestions}
                    className="w-full mt-3 text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors"
                >
                    See more suggestions
                </button>
            )}
        </div>
    );
}
