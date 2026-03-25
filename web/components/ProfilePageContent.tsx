'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, UserPlus,
    Image as ImageIcon, MoreVertical, MessageCircle,
    Star, Check, X, Users, Info, ShieldAlert, Shield,
    Share2, Mail, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import EditProfileModal from '@/components/EditProfileModal';
import CreatePost from '@/components/CreatePost';
import PostModal from '@/components/PostModal';
import { fixUrl } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

interface User {
    id: string;
    username: string;
    displayName?: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
    coverOffset?: number;
    createdAt: string;
    reputation?: number;
    _count: {
        posts: number;
        friends: number;
    };
}

interface Post {
    id: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
    author: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    _count: {
        likes: number;
        comments: number;
    };
}

export default function ProfilePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user: currentUser, requireAuth } = useAuth();

    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'friends' | 'about'>('posts');
    const [showEditModal, setShowEditModal] = useState(false);
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'incoming' | 'friends'>('none');
    const [friendRequestId, setFriendRequestId] = useState<string>('');
    const [sendingRequest, setSendingRequest] = useState(false);
    const [friendError, setFriendError] = useState<string>('');
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockedByMe, setBlockedByMe] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [errorCode, setErrorCode] = useState<number | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Cover repositioning state
    const [isDraggingCover, setIsDraggingCover] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [tempCoverOffset, setTempCoverOffset] = useState(50);
    const coverContainerRef = useRef<HTMLDivElement>(null);

    const handleCoverMouseDown = (e: React.MouseEvent) => {
        if (!isOwnProfile) return;
        setIsDraggingCover(true);
        setDragStartY(e.clientY);
        setTempCoverOffset(user?.coverOffset || 50);
    };

    const handleCoverMouseMove = (e: MouseEvent) => {
        if (!isDraggingCover || !coverContainerRef.current) return;
        const deltaY = e.clientY - dragStartY;
        const containerHeight = coverContainerRef.current.offsetHeight;
        const offsetChange = (deltaY / containerHeight) * 100;
        const newOffset = Math.max(0, Math.min(100, tempCoverOffset - offsetChange));
        setTempCoverOffset(newOffset);

        // Optimistic update
        if (user) {
            setUser({ ...user, coverOffset: newOffset });
        }
    };

    const handleCoverMouseUp = async () => {
        if (!isDraggingCover) return;
        setIsDraggingCover(false);
        try {
            await api.patch('/auth/profile', { coverOffset: tempCoverOffset });
        } catch (error) {
            console.error('Failed to save cover offset:', error);
        }
    };

    useEffect(() => {
        if (isDraggingCover) {
            window.addEventListener('mousemove', handleCoverMouseMove);
            window.addEventListener('mouseup', handleCoverMouseUp);
        } else {
            window.removeEventListener('mousemove', handleCoverMouseMove);
            window.removeEventListener('mouseup', handleCoverMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleCoverMouseMove);
            window.removeEventListener('mouseup', handleCoverMouseUp);
        };
    }, [isDraggingCover, tempCoverOffset]);

    const fetchProfile = async () => {
        try {
            setErrorCode(null);

            let slug = searchParams.get('username');

            if (!slug) {
                const pathname = window.location.pathname;
                const parts = pathname.split('/').filter(Boolean);
                const profileIndex = parts.indexOf('profile');
                if (profileIndex !== -1 && parts[profileIndex + 1]) {
                    slug = parts[profileIndex + 1];

                    const potentialPostId = parts[profileIndex + 2];
                    if (potentialPostId && !selectedPost) {
                        setTimeout(() => {
                            setPosts(prev => {
                                const post = prev.find(p => p.id === potentialPostId);
                                if (post) {
                                    setSelectedPost(post);
                                    setShowPostModal(true);
                                }
                                return prev;
                            });
                        }, 1000);
                    }
                }
            }

            if (!slug) slug = currentUser?.username;

            if (!slug) {
                setLoading(false);
                return;
            }

            setIsOwnProfile(slug === currentUser?.username);

            try {
                const [profileRes, postsRes] = await Promise.all([
                    api.get(`/profile/${slug}`),
                    api.get(`/posts/user/${slug}`)
                ]);

                setUser(profileRes.data);
                setPosts(postsRes.data);

                // Fetch friends list
                const friendsRes = await api.get(`/friends/user/${profileRes.data.id}`);
                setFriends(friendsRes.data);

                if (slug !== currentUser?.username && currentUser) {
                    checkRelations(profileRes.data);
                }

                if (currentUser) {
                    try {
                        const adminCheck = await api.get('/admin/overview');
                        if (adminCheck.status === 200) setIsAdmin(true);
                    } catch {
                        setIsAdmin(false);
                    }
                }
            } catch (err: any) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setErrorCode(err.response.status);
                } else if (err.response?.status === 404) {
                    setErrorCode(404);
                }
                throw err;
            }

        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkRelations = async (targetUser: User) => {
        try {
            const [friendsRes, pendingRes, blockRes] = await Promise.all([
                api.get('/friends'),
                api.get('/friends/requests'),
                api.get(`/privacy/check-blocked/${targetUser.id}`)
            ]);

            const userFriends = friendsRes.data;
            const isFriend = userFriends.some((f: any) => f.username === targetUser.username);

            if (isFriend) {
                setFriendStatus('friends');
            } else {
                const pending = pendingRes.data;
                const outgoing = pending.find((r: any) => r.friendId === targetUser.id);
                const incoming = pending.find((r: any) => r.userId === targetUser.id);

                if (outgoing) {
                    setFriendStatus('pending');
                } else if (incoming) {
                    setFriendStatus('incoming');
                    setFriendRequestId(incoming.id);
                } else {
                    setFriendStatus('none');
                }
            }

            setIsBlocked(blockRes.data.isBlocked);
            setBlockedByMe(blockRes.data.blockedByMe);
        } catch (error) {
            console.error('Failed to check relation status:', error);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [searchParams, currentUser?.username]);

    const handleAcceptRequest = async () => {
        if (!friendRequestId) return;
        try {
            await api.post(`/friends/accept/${friendRequestId}`);
            setFriendStatus('friends');
            setFriendRequestId('');
            fetchProfile();
        } catch (error: any) {
            setFriendError(error?.response?.data?.message || 'Failed to accept request');
        }
    };

    const handleFriendRequest = () => {
        requireAuth(async () => {
            if (!user) return;
            setSendingRequest(true);
            try {
                await api.post('/friends/request', { friendId: user.id });
                setFriendStatus('pending');
            } catch (error: any) {
                setFriendError(error?.response?.data?.message || 'Failed to send request');
            } finally {
                setSendingRequest(false);
            }
        }, "Log in to add friends");
    };

    const handleBlock = async () => {
        if (!user) return;
        requireAuth(async () => {
            if (!confirm(`Are you sure you want to block @${user.username}?`)) return;
            try {
                await api.post(`/privacy/block/${user.id}`);
                setIsBlocked(true);
                setBlockedByMe(true);
                setFriendStatus('none');
                setShowMenu(false);
            } catch (error) {
                console.error('Failed to block user:', error);
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-500/20 rounded-full animate-spin border-t-blue-500"></div>
                </div>
                <div className="space-y-2 text-center">
                    <p className="text-white font-bold tracking-widest uppercase text-[10px] animate-pulse">Syncing Profile Node</p>
                    <div className="flex gap-1 justify-center">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (errorCode === 403) {
        return (
            <div className="max-w-lg mx-auto mt-32 p-10 bg-[#1e293b] border border-white/10 rounded-[3rem] text-center shadow-2xl">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 ring-1 ring-red-500/20">
                    <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">ACCESS RESTRICTED</h2>
                <p className="text-slate-400 mb-10 text-sm leading-relaxed">This profile node is private or you have been restricted from accessing it.</p>
                <button
                    onClick={() => router.push('/')}
                    className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all shadow-lg"
                >
                    Return to Safe Zone
                </button>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-lg mx-auto mt-32 text-center p-12 bg-[#1e293b] border border-white/10 rounded-[3rem]">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserPlus className="w-10 h-10 text-slate-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">IDENTITY NOT FOUND</h2>
                <p className="text-slate-500 text-sm mb-10">The specified identity identifier does not exist in the decentralized mesh.</p>
                <button
                    onClick={() => router.push('/')}
                    className="text-blue-500 font-black uppercase text-[10px] tracking-widest hover:text-blue-400"
                >
                    Back to Registry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Header / Cover Container */}
            <div
                ref={coverContainerRef}
                onMouseDown={handleCoverMouseDown}
                className={`relative w-full h-[35vh] overflow-hidden ${isOwnProfile ? 'cursor-ns-resize group/cover' : ''}`}
            >
                <div className="absolute inset-0">
                    {user.coverUrl ? (
                        <img
                            src={fixUrl(user.coverUrl)}
                            className="w-full h-full object-cover pointer-events-none select-none"
                            style={{ objectPosition: `center ${user.coverOffset || 50}%` }}
                            alt="Cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-900 via-slate-900 to-black"></div>
                    )}
                    {/* Simplified Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f172a]/80"></div>
                </div>

                {isOwnProfile && (
                    <div className="absolute bottom-4 right-8 opacity-0 group-hover/cover:opacity-100 transition-opacity">
                        <p className="bg-black/80 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10">
                            Drag up/down to reposition
                        </p>
                    </div>
                )}

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="absolute top-8 left-8 w-10 h-10 bg-[#0f172a]/40 border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-[#0f172a]/60 transition-all z-20 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Profile Content Container (Overlapping) */}
            <div className="w-full px-4 -mt-32 relative z-10 pb-20">
                <div className="flex flex-col gap-8">

                    {/* Main Section */}
                    <div className="space-y-6">
                        {/* Identity Card - Compact Redesign */}
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 relative shadow-[0_32px_128px_-16px_rgba(0,0,0,0.4)] overflow-hidden">
                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-center">
                                <div className="relative group">
                                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#0f172a] shadow-2xl relative z-10 bg-slate-900">
                                        {user.avatarUrl ? (
                                            <img src={fixUrl(user.avatarUrl)} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="Avatar" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black">
                                                {user.displayName?.[0] || user.username[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 text-center md:text-left space-y-1">
                                    <h1 className="text-2xl font-black text-white tracking-tight">{user.displayName || user.username}</h1>
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-blue-400 font-bold text-xs uppercase tracking-wider">@{user.username}</p>
                                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Node ID: {user.id.slice(0, 8)}</p>
                                    </div>

                                    {user.bio && (
                                        <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-lg mt-2">
                                            {user.bio}
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {/* Compact Action Buttons */}
                                <div className="flex gap-2">
                                    {isOwnProfile ? (
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="px-6 py-2.5 bg-white text-slate-900 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-100 transition-all"
                                        >
                                            Customize Node
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            {friendStatus === 'incoming' ? (
                                                <button
                                                    onClick={handleAcceptRequest}
                                                    className="px-6 py-2.5 bg-green-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-green-500 transition-all shadow-lg shadow-green-500/20"
                                                >
                                                    Accept Node
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleFriendRequest}
                                                    disabled={friendStatus === 'friends' || friendStatus === 'pending'}
                                                    className={`px-6 py-2.5 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg ${friendStatus === 'friends'
                                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                        : friendStatus === 'pending'
                                                            ? 'bg-slate-800 text-slate-500'
                                                            : 'bg-blue-600 text-white hover:bg-blue-500'
                                                        }`}
                                                >
                                                    {friendStatus === 'friends' ? 'Connected' : friendStatus === 'pending' ? 'Waiting' : 'Link Node'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => router.push(`/messages?userId=${user.id}`)}
                                                className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation & Controls - Cleaned up */}
                        <div className="flex items-center justify-between p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sticky top-4 z-40 shadow-xl">
                            <div className="flex gap-1">
                                {[
                                    { id: 'posts', label: 'Timeline', icon: Calendar },
                                    { id: 'friends', label: 'Network', icon: Users },
                                    { id: 'about', label: 'Manifest', icon: Info }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all ${activeTab === tab.id
                                            ? 'bg-white text-slate-950 shadow-lg'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <tab.icon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 pr-2 relative">
                                <button className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
                                    <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMenu(!showMenu)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${showMenu ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                    >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                    <AnimatePresence>
                                        {showMenu && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    className="absolute right-0 top-full mt-2 w-48 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right"
                                                >
                                                    {!isOwnProfile && (
                                                        <button
                                                            onClick={handleBlock}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider"
                                                        >
                                                            <ShieldAlert className="w-4 h-4" />
                                                            Block Node
                                                        </button>
                                                    )}
                                                </motion.div>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Content Feed */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                {activeTab === 'posts' && (
                                    <>
                                        {isOwnProfile && currentUser?.isVerified && (
                                            <CreatePost onPostCreated={fetchProfile} />
                                        )}
                                        <div className="space-y-6">
                                            {posts.length > 0 ? (
                                                posts.map(post => (
                                                    <PostCard
                                                        key={post.id}
                                                        post={post}
                                                        onDelete={fetchProfile}
                                                        onClick={() => { setSelectedPost(post); setShowPostModal(true); }}
                                                    />
                                                ))
                                            ) : (
                                                <div className="py-32 text-center bg-[#0f172a]/30 border border-dashed border-white/5 rounded-[3rem]">
                                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                                        <ImageIcon className="w-6 h-6 text-slate-700" />
                                                    </div>
                                                    <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">Node History Empty</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'friends' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {friends.length > 0 ? (
                                            friends.map(friend => (
                                                <Link
                                                    key={friend.id}
                                                    href={`/profile/${friend.username}`}
                                                    className="p-5 bg-[#1e293b] border border-white/5 rounded-2xl hover:bg-slate-800 transition-all group flex items-center gap-4 shadow-xl"
                                                >
                                                    <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                                                        {friend.avatarUrl ? (
                                                            <img src={fixUrl(friend.avatarUrl)} className="w-full h-full object-cover" alt={friend.username} />
                                                        ) : (
                                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-black text-lg">
                                                                {friend.displayName?.[0] || friend.username[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-white font-black text-sm uppercase tracking-tight truncate">{friend.displayName || friend.username}</h4>
                                                        <p className="text-blue-500 font-black text-[9px] uppercase tracking-widest truncate">@{friend.username}</p>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-32 text-center bg-[#0f172a]/30 border border-dashed border-white/5 rounded-[3rem]">
                                                <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">Zero Connections Data</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'about' && (
                                    <div className="bg-[#1e293b] border border-white/5 p-10 rounded-[3rem] space-y-10 shadow-2xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Core Credentials</h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4 group">
                                                        <div className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                                                            <Mail className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Digital Address</p>
                                                            <p className="text-white font-black text-xs">{user.email || 'Restricted Access'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 group">
                                                        <div className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                                                            <Star className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Network Reputation</p>
                                                            <p className="text-yellow-500 font-black text-xs">{(user.reputation || 0).toLocaleString()} MESH INDEX</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Hardware Link</h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4 group">
                                                        <div className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                                                            <LinkIcon className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Public Link</p>
                                                            <p className="text-white font-black text-xs truncate max-w-[200px]">mrohaung.com/profile/{user.username}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 group opacity-50 grayscale hover:grayscale-0 transition-all">
                                                        <div className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                                                            <Shield className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Identity Status</p>
                                                            <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Unverified Node</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <EditProfileModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                currentUser={user}
                onUpdate={fetchProfile}
            />
            {selectedPost && (
                <PostModal
                    isOpen={showPostModal}
                    onClose={() => setShowPostModal(false)}
                    post={selectedPost}
                    onDelete={() => { setShowPostModal(false); fetchProfile(); }}
                />
            )}
        </div>
    );
}
