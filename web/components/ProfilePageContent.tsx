'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, UserPlus,
    Image as ImageIcon, MoreVertical, MessageCircle,
    Star, Check, X, Users, Info, ShieldAlert, Shield,
    Share2, Mail, Link as LinkIcon, Edit2, Clock
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
    isVerified?: boolean;
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
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative">
                    <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 rounded-full border-t-blue-500 animate-spin"></div>
                </div>
                <p className="text-slate-500 font-bold text-sm animate-pulse">Loading profile...</p>
            </div>
        );
    }

    if (errorCode === 403) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl text-center shadow-sm">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
                <p className="text-slate-500 mb-8 text-sm">This profile is private or you have been blocked from viewing it.</p>
                <button
                    onClick={() => router.push('/')}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold rounded-xl text-sm transition-all"
                >
                    Return Home
                </button>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserPlus className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">User Not Found</h2>
                <p className="text-slate-500 mb-8 text-sm">This account doesn't exist or may have been deleted.</p>
                <button
                    onClick={() => router.push('/')}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-blue-600 dark:hover:bg-blue-700 text-slate-900 dark:text-white font-bold rounded-xl text-sm transition-all"
                >
                    Back to Feed
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
                    className="absolute top-8 left-8 w-10 h-10 bg-slate-50 dark:bg-[#0f172a]/40 border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-slate-50 dark:bg-[#0f172a]/60 transition-all z-20 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Profile Content Container (Overlapping) */}
            <div className="w-full px-4 -mt-32 relative z-10 pb-20">
                <div className="flex flex-col gap-8">

                    {/* Main Section */}
                    <div className="space-y-4">
                        {/* Profile Header Card */}
                        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-3xl p-6 relative shadow-sm overflow-hidden">
                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                {/* Avatar */}
                                <div className="relative group shrink-0">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-[#0f172a] shadow-lg relative z-10 bg-slate-100 dark:bg-slate-800">
                                        {user.avatarUrl ? (
                                            <img src={fixUrl(user.avatarUrl)} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" alt="Avatar" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white text-3xl md:text-4xl font-black">
                                                {(user.displayName || user.username)[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    {isOwnProfile && (
                                        <button 
                                            onClick={() => setShowEditModal(true)}
                                            className="absolute bottom-1 right-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-105 z-20"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className="flex-1 text-center md:text-left space-y-2 pt-2">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 justify-center md:justify-start">
                                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                            {user.displayName || user.username}
                                        </h1>
                                        {user.isVerified && (
                                            <Shield className="w-5 h-5 text-blue-500" />
                                        )}
                                    </div>
                                    <p className="text-blue-500 font-semibold text-sm">@{user.username}</p>
                                    
                                    {user.bio && (
                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-2xl mt-3">
                                            {user.bio}
                                        </p>
                                    )}

                                    {/* Stats (Compact) */}
                                    <div className="flex items-center justify-center md:justify-start gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="text-center md:text-left">
                                            <span className="block text-lg font-bold text-slate-900 dark:text-white">{user._count?.posts || 0}</span>
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Posts</span>
                                        </div>
                                        <div className="text-center md:text-left">
                                            <span className="block text-lg font-bold text-slate-900 dark:text-white">{user._count?.friends || 0}</span>
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Friends</span>
                                        </div>
                                        <div className="text-center md:text-left">
                                            <span className="block text-lg font-bold text-slate-900 dark:text-white">{user.reputation || 0}</span>
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Points</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 min-w-[140px] pt-2">
                                    {isOwnProfile ? (
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="w-full px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit Profile
                                        </button>
                                    ) : (
                                        <>
                                            {friendStatus === 'incoming' ? (
                                                <button
                                                    onClick={handleAcceptRequest}
                                                    className="w-full px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Accept Request
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleFriendRequest}
                                                    disabled={friendStatus === 'friends' || friendStatus === 'pending'}
                                                    className={`w-full px-5 py-2.5 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                                                        friendStatus === 'friends'
                                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                            : friendStatus === 'pending'
                                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                        }`}
                                                >
                                                    {friendStatus === 'friends' ? (
                                                        <><Check className="w-4 h-4" /> Friends</>
                                                    ) : friendStatus === 'pending' ? (
                                                        <><Clock className="w-4 h-4" /> Pending</>
                                                    ) : (
                                                        <><UserPlus className="w-4 h-4" /> Add Friend</>
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => router.push(`/messages?userId=${user.id}`)}
                                                className="w-full px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                Message
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center justify-between p-1.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl sticky top-4 z-40 shadow-sm">
                            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'posts', label: 'Timeline' },
                                    { id: 'friends', label: 'Friends' },
                                    { id: 'about', label: 'About' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex gap-1 pl-2 border-l border-slate-100 dark:border-white/10 ml-2">
                                <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/profile/${user.username}`;
                                        navigator.clipboard.writeText(url);
                                        alert('Profile link copied!');
                                    }}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                                {!isOwnProfile && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowMenu(!showMenu)}
                                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${showMenu ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                        <AnimatePresence>
                                            {showMenu && (
                                                <>
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 origin-top-right"
                                                    >
                                                        <button
                                                            onClick={handleBlock}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors text-sm font-bold"
                                                        >
                                                            <ShieldAlert className="w-4 h-4" />
                                                            Block User
                                                        </button>
                                                    </motion.div>
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Feed */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {activeTab === 'posts' && (
                                    <>
                                        {isOwnProfile && (
                                            <CreatePost onPostCreated={fetchProfile} />
                                        )}
                                        <div className="space-y-4">
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
                                                <div className="py-20 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl">
                                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-white/5">
                                                        <ImageIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                                                    </div>
                                                    <p className="text-slate-500 font-bold text-sm">No posts yet</p>
                                                    <p className="text-slate-400 text-xs mt-1">When {isOwnProfile ? 'you post' : user.username + ' posts'}, it'll show up here.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'friends' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {friends.length > 0 ? (
                                            friends.map(friend => (
                                                <Link
                                                    key={friend.id}
                                                    href={`/profile/${friend.username}`}
                                                    className="p-4 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-4 shadow-sm"
                                                >
                                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                        {friend.avatarUrl ? (
                                                            <img src={fixUrl(friend.avatarUrl)} className="w-full h-full object-cover" alt={friend.username} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white font-bold text-lg">
                                                                {(friend.displayName || friend.username)[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-slate-900 dark:text-white font-bold text-sm truncate">{friend.displayName || friend.username}</h4>
                                                        <p className="text-slate-500 text-xs truncate">@{friend.username}</p>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-20 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl">
                                                <p className="text-slate-500 font-bold text-sm">No friends to show</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'about' && (
                                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 p-8 rounded-3xl space-y-8 shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Details Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Details</h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <Mail className="w-5 h-5 text-slate-400" />
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500">Email Address</p>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.email || 'Hidden'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Calendar className="w-5 h-5 text-slate-400" />
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500">Joined</p>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reputation Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Community</h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <Star className="w-5 h-5 text-amber-500" />
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500">Reputation Score</p>
                                                            <p className="text-sm font-bold text-amber-500">{(user.reputation || 0).toLocaleString()} points</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Shield className={`w-5 h-5 ${user.isVerified ? 'text-blue-500' : 'text-slate-400'}`} />
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500">Account Status</p>
                                                            <p className={`text-sm font-bold ${user.isVerified ? 'text-blue-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                {user.isVerified ? 'Verified Account' : 'Standard Account'}
                                                            </p>
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
