'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, UserCheck, X, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';

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
    const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'suggestions' | 'requests' | 'sent'>('suggestions');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchFriends();
        fetchSuggestions();
        fetchPendingRequests();
        fetchSentRequests();
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
            // Refresh sent requests
            fetchSentRequests();
        } catch (error) {
            console.error('Failed to send friend request:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const fetchSentRequests = async () => {
        try {
            const response = await api.get('/friends/sent');
            setSentRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch sent requests:', error);
        }
    };

    const handleCancelRequest = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await api.delete(`/friends/cancel/${requestId}`);
            setSentRequests(prev => prev.filter(req => req.id !== requestId));
        } catch (error) {
            console.error('Failed to cancel request:', error);
        } finally {
            setProcessingId(null);
        }
    };
    return (
        <div className="max-w-4xl mx-auto">
            {/* Page Title */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Friends</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage your connections</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-white/10 flex gap-8 mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`pb-4 font-bold transition-colors relative whitespace-nowrap ${activeTab === 'suggestions' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                    Suggestions
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                        {suggestions.length}
                    </span>
                    {activeTab === 'suggestions' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-500 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-4 font-bold transition-colors relative whitespace-nowrap ${activeTab === 'requests' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                    Requests
                    <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${pendingRequests.length > 0 ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'}`}>
                        {pendingRequests.length}
                    </span>
                    {activeTab === 'requests' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-500 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('sent')}
                    className={`pb-4 font-bold transition-colors relative whitespace-nowrap ${activeTab === 'sent' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                    Sent Requests
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                        {sentRequests.length}
                    </span>
                    {activeTab === 'sent' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-500 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : activeTab === 'suggestions' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.length > 0 ? (
                        suggestions.map((user) => (
                            <div
                                key={user.id}
                                className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col items-center text-center">
                                    <div
                                        onClick={() => router.push(`/profile/${user.username}`)}
                                        className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3 cursor-pointer hover:opacity-80 transition-opacity ring-4 ring-slate-50 dark:ring-[#0f172a]"
                                    >
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.displayName || user.username || ''}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-white font-bold text-2xl">
                                                {(user.displayName || user.username)?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-0.5 line-clamp-1">{user.displayName || user.username}</h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">@{user.username}</p>

                                    {user.mutualFriendsCount > 0 && (
                                        <div className="mb-4 flex -space-x-2 items-center justify-center">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-200 dark:border-[#1e293b] flex items-center justify-center">
                                                <Users className="w-3 h-3 text-slate-500" />
                                            </div>
                                            <span className="pl-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                {user.mutualFriendsCount} mutual friends
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleAddFriend(user.id)}
                                        disabled={processingId === user.id}
                                        className="w-full mt-auto px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 disabled:opacity-50 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2"
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
                        <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-[#1e293b]/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
                            <Users className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:opacity-50" />
                            <p className="text-slate-600 dark:text-slate-400 font-bold text-lg">No suggestions right now</p>
                            <p className="text-sm font-medium text-slate-500 mt-2">Come back later to find more friends!</p>
                        </div>
                    )}
                </div>
            ) : activeTab === 'requests' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingRequests.length > 0 ? (
                        pendingRequests.map((request) => (
                            <div
                                key={request.id}
                                className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        onClick={() => router.push(`/profile/${request.username}`)}
                                        className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {request.avatarUrl ? (
                                            <img
                                                src={request.avatarUrl}
                                                alt={request.displayName || request.username || ''}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-white font-bold text-xl">
                                                {(request.displayName || request.username)?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{request.displayName || request.username}</h3>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sent a friend request</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => handleAcceptRequest(request.id)}
                                        disabled={processingId === request.id}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors font-bold flex items-center justify-center gap-1.5"
                                    >
                                        {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Accept</>}
                                    </button>
                                    <button
                                        onClick={() => handleRejectRequest(request.id)}
                                        disabled={processingId === request.id}
                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-white rounded-xl transition-colors font-bold flex items-center justify-center gap-1.5"
                                    >
                                        <X className="w-4 h-4" /> Decline
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-[#1e293b]/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
                            <UserPlus className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:opacity-50" />
                            <p className="text-slate-600 dark:text-slate-400 font-bold text-lg">No pending requests</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sentRequests.length > 0 ? (
                        sentRequests.map((request) => (
                            <div
                                key={request.id}
                                className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                            >
                                <div
                                    onClick={() => router.push(`/profile/${request.username}`)}
                                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    {request.avatarUrl ? (
                                        <img
                                            src={request.avatarUrl}
                                            alt={request.displayName || request.username || ''}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-white font-bold text-lg">
                                            {(request.displayName || request.username)?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{request.displayName || request.username}</h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Request sent</p>
                                </div>
                                <button
                                    onClick={() => handleCancelRequest(request.id)}
                                    disabled={processingId === request.id}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-50 rounded-xl text-slate-700 dark:text-white transition-colors font-bold text-sm"
                                >
                                    {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel'}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-[#1e293b]/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
                            <UserPlus className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:opacity-50" />
                            <p className="text-slate-600 dark:text-slate-400 font-bold text-lg">No sent requests</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
