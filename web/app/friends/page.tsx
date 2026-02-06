'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, UserCheck, X, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import AppShell from '@/components/AppShell';

interface Friend {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

interface FriendRequest {
    id: string;
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export default function FriendsPage() {
    const router = useRouter();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'suggestions' | 'requests'>('suggestions');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchFriends();
        fetchSuggestions();
        fetchPendingRequests();
    }, []);

    const fetchFriends = async () => {
        try {
            const response = await api.get('/friends');
            setFriends(response.data);
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        }
    };

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            let response = await api.get('/suggestions/friends?limit=20');
            if (response.data.length === 0) {
                response = await api.get('/suggestions/random?limit=20');
            }
            setSuggestions(response.data);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const response = await api.get('/friends/requests');
            setPendingRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch pending requests:', error);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await api.post(`/friends/accept/${requestId}`);
            setPendingRequests(prev => prev.filter(req => req.id !== requestId));
            fetchFriends(); // Refresh friends list
        } catch (error) {
            console.error('Failed to accept request:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await api.delete(`/friends/reject/${requestId}`);
            setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        } catch (error) {
            console.error('Failed to reject request:', error);
        } finally {
            setProcessingId(null);
        }
    };
    const handleAddFriend = async (userId: string) => {
        setProcessingId(userId);
        try {
            await api.post(`/friends/request/${userId}`);
            // Update suggestions to show request sent or remove
            setSuggestions(prev => prev.filter(s => s.id !== userId));
        } catch (error) {
            console.error('Failed to send friend request:', error);
        } finally {
            setProcessingId(null);
        }
    };
    return (
        <AppShell>
            <div>
                {/* Page Title */}
                <div className="mb-6">
                    <h1 className="text-2xl font-black text-white">Friends</h1>
                    <p className="text-sm text-[#94a3b8]">{suggestions.length} suggestions for you</p>
                </div>

                {/* Tabs */}
                <div className="border-b border-[#1e293b] flex gap-8 mb-6">
                    <button
                        onClick={() => setActiveTab('suggestions')}
                        className={`pb-4 font-semibold transition-colors relative ${activeTab === 'suggestions' ? 'text-blue-500' : 'text-[#64748b] hover:text-white'
                            }`}
                    >
                        Suggest Friends ({suggestions.length})
                        {activeTab === 'suggestions' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`pb-4 font-semibold transition-colors relative ${activeTab === 'requests' ? 'text-blue-500' : 'text-[#64748b] hover:text-white'
                            }`}
                    >
                        Requests ({pendingRequests.length})
                        {activeTab === 'requests' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />
                        )}
                        {pendingRequests.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : activeTab === 'suggestions' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suggestions.length > 0 ? (
                            suggestions.map((user) => (
                                <div
                                    key={user.id}
                                    className="bg-[#1e293b]/50 border border-[#334155] rounded-3xl p-6 hover:border-[#475569] transition-all group"
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div
                                            onClick={() => router.push(`/profile/${user.username}`)}
                                            className="w-20 h-20 rounded-full bg-[#334155] overflow-hidden mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                                        >
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.displayName || user.username || ''}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
                                                    <span className="text-2xl font-bold text-white">
                                                        {(user.displayName || user.username)?.[0]?.toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{user.displayName || user.username}</h3>
                                        <p className="text-sm text-[#64748b] mb-4">@{user.username}</p>

                                        {user.mutualFriendsCount > 0 && (
                                            <p className="text-xs text-blue-500/80 mb-4 font-medium">
                                                {user.mutualFriendsCount} mutual friends
                                            </p>
                                        )}

                                        <button
                                            onClick={() => handleAddFriend(user.id)}
                                            disabled={processingId === user.id}
                                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl font-bold text-white transition-all transform active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {processingId === user.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4" />
                                                    Add Friend
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 bg-[#1e293b]/20 rounded-3xl border border-dashed border-[#334155]">
                                <Users className="w-16 h-16 mx-auto mb-4 text-[#64748b] opacity-50" />
                                <p className="text-[#64748b]">No suggestions right now</p>
                                <p className="text-sm text-[#64748b] mt-2">Come back later to find more friends!</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingRequests.length > 0 ? (
                            pendingRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-4 hover:border-[#475569] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            onClick={() => router.push(`/profile/${request.username}`)}
                                            className="w-14 h-14 rounded-full bg-[#334155] overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                        >
                                            {request.avatarUrl ? (
                                                <img
                                                    src={request.avatarUrl}
                                                    alt={request.displayName || request.username || ''}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                                    <span className="text-xl font-bold">
                                                        {(request.displayName || request.username)?.[0]?.toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white truncate">{request.displayName || request.username}</h3>
                                            <p className="text-sm text-[#64748b]">wants to be your friend</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAcceptRequest(request.id)}
                                                disabled={processingId === request.id}
                                                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-full transition-colors"
                                            >
                                                {processingId === request.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Check className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(request.id)}
                                                disabled={processingId === request.id}
                                                className="p-2 bg-[#334155] hover:bg-red-500/20 disabled:opacity-50 rounded-full transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-[#1e293b]/20 rounded-3xl border border-dashed border-[#334155]">
                                <UserPlus className="w-16 h-16 mx-auto mb-4 text-[#64748b] opacity-50" />
                                <p className="text-[#64748b]">No pending requests</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
