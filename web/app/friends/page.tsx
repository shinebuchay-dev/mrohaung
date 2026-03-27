'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, UserCheck, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
            {/* Minimal Page Header */}
            <div className="mb-8 pt-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Friends</h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-1">Manage your connections and find new friends</p>
            </div>

            {/* Clean Minimal Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 dark:border-white/5 mb-8 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'suggestions', label: 'Suggestions', count: suggestions.length },
                    { id: 'requests', label: 'Requests', count: pendingRequests.length, highlight: pendingRequests.length > 0 },
                    { id: 'sent', label: 'Sent', count: sentRequests.length }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`relative px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        {tab.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${tab.highlight 
                            ? 'bg-red-500 text-white' 
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                            {tab.count}
                        </span>
                        {activeTab === tab.id && (
                            <motion.div layoutId="friendsTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 opacity-50">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                            <p className="text-sm font-medium text-slate-400">Loading connections...</p>
                        </div>
                    ) : activeTab === 'suggestions' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {suggestions.length > 0 ? (
                                suggestions.map((user) => (
                                    <div
                                        key={user.id}
                                        className="group bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 rounded-2xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.02] hover:shadow-sm h-full"
                                    >
                                        <div className="flex items-center gap-4 h-full">
                                            <div
                                                onClick={() => router.push(`/profile/${user.username}`)}
                                                className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer relative flex-shrink-0"
                                            >
                                                {user.avatarUrl ? (
                                                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-lg">
                                                        {(user.displayName || user.username)?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 pr-1">
                                                <h3 
                                                    onClick={() => router.push(`/profile/${user.username}`)}
                                                    className="font-bold text-slate-900 dark:text-white text-[15px] line-clamp-1 group-hover:text-blue-500 transition-colors mb-2 cursor-pointer"
                                                >
                                                    {user.displayName || user.username}
                                                </h3>
                                                
                                                <button
                                                    onClick={() => handleAddFriend(user.id)}
                                                    disabled={processingId === user.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] transition-all active:scale-95 shadow-sm shadow-blue-500/10"
                                                >
                                                    {processingId === user.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <UserPlus className="w-3 h-3" />
                                                            Add Friend
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-24 text-center">
                                    <Users className="w-12 h-12 mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                                    <p className="text-slate-400 font-semibold text-sm">No suggestions found</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'requests' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {pendingRequests.length > 0 ? (
                                pendingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 rounded-xl p-3 flex items-center gap-3 transition-all hover:shadow-sm"
                                    >
                                        <div
                                            onClick={() => router.push(`/profile/${request.username}`)}
                                            className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 cursor-pointer"
                                        >
                                            {request.avatarUrl ? (
                                                <img src={request.avatarUrl} alt={request.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                                                    {(request.displayName || request.username)?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xs truncate">{request.displayName || request.username}</h3>
                                            <div className="flex gap-1.5 mt-2">
                                                <button
                                                    onClick={() => handleAcceptRequest(request.id)}
                                                    disabled={processingId === request.id}
                                                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                                                >
                                                    {processingId === request.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Accept'}
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(request.id)}
                                                    disabled={processingId === request.id}
                                                    className="flex-1 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-colors"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-24 text-center">
                                    <UserPlus className="w-12 h-12 mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                                    <p className="text-slate-400 font-semibold text-sm">No pending requests</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sentRequests.length > 0 ? (
                                sentRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 rounded-xl p-2.5 flex items-center gap-3 group"
                                    >
                                        <div
                                            onClick={() => router.push(`/profile/${request.username}`)}
                                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 cursor-pointer"
                                        >
                                            {request.avatarUrl ? (
                                                <img src={request.avatarUrl} alt={request.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                                    {(request.displayName || request.username)?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-blue-500 transition-colors">
                                                {request.displayName || request.username}
                                            </h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sent</p>
                                        </div>
                                        <button
                                            onClick={() => handleCancelRequest(request.id)}
                                            disabled={processingId === request.id}
                                            className="px-3 py-1 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-500 dark:text-slate-400 rounded-lg font-bold text-[9px] transition-colors"
                                        >
                                            {processingId === request.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Cancel'}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-24 text-center">
                                    <UserPlus className="w-12 h-12 mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                                    <p className="text-slate-400 font-semibold text-sm">No sent requests</p>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
