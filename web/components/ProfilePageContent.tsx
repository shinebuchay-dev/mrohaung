'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, UserPlus,
    Image as ImageIcon, MoreVertical, MessageCircle,
    Star, Check, X, ShieldAlert, Shield,
    Share2, Mail, Edit2, Clock, Camera
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
    _count: { posts: number; friends: number; };
}

interface Post {
    id: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
    author: { id: string; username: string; displayName?: string; avatarUrl?: string; };
    _count: { likes: number; comments: number; };
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
    const [isBlocked, setIsBlocked] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [errorCode, setErrorCode] = useState<number | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [showPostModal, setShowPostModal] = useState(false);

    // Reposition mode
    const [repositionMode, setRepositionMode] = useState(false);
    const [isDraggingCover, setIsDraggingCover] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [tempCoverOffset, setTempCoverOffset] = useState(50);
    const [originalOffset, setOriginalOffset] = useState(50);
    const coverContainerRef = useRef<HTMLDivElement>(null);

    const handleCoverMouseDown = (e: React.MouseEvent) => {
        if (!repositionMode) return;
        e.preventDefault(); // Prevent text selection
        setIsDraggingCover(true);
        setDragStartY(e.clientY);
        setTempCoverOffset(user?.coverOffset || 50);
    };

    const handleCoverMouseMove = (e: MouseEvent) => {
        if (!isDraggingCover || !coverContainerRef.current) return;
        const deltaY = e.clientY - dragStartY;
        const containerHeight = coverContainerRef.current.offsetHeight;
        const newOffset = Math.max(0, Math.min(100, tempCoverOffset - (deltaY / containerHeight) * 100));
        if (user) setUser({ ...user, coverOffset: newOffset });
    };

    const handleCoverMouseUp = () => {
        if (!isDraggingCover) return;
        setIsDraggingCover(false);
        if (user) setTempCoverOffset(user.coverOffset || 50);
    };

    const handleSaveReposition = async () => {
        try {
            const formData = new FormData();
            if (user?.coverOffset !== undefined) {
                formData.append('coverOffset', Math.round(user.coverOffset).toString());
            }
            await api.put('profile', formData);
            setRepositionMode(false);
        } catch (err) {
            console.error('Save position error:', err);
            alert('Fail to save position');
        }
    };

    const handleCancelReposition = () => {
        if (user) setUser({ ...user, coverOffset: originalOffset });
        setRepositionMode(false);
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
                const parts = window.location.pathname.split('/').filter(Boolean);
                const idx = parts.indexOf('profile');
                if (idx !== -1 && parts[idx + 1]) slug = parts[idx + 1];
            }
            if (!slug) slug = currentUser?.username;
            if (!slug) { setLoading(false); return; }
            setIsOwnProfile(slug === currentUser?.username);
            const [profileRes, postsRes] = await Promise.all([
                api.get(`/profile/${slug}`),
                api.get(`/posts/user/${slug}`)
            ]);
            setUser(profileRes.data);
            setPosts(postsRes.data);
            const friendsRes = await api.get(`/friends/user/${profileRes.data.id}`);
            setFriends(friendsRes.data);
            if (slug !== currentUser?.username && currentUser) checkRelations(profileRes.data);
        } catch (err: any) {
            if (err.response?.status === 403) setErrorCode(403);
            else if (err.response?.status === 404) setErrorCode(404);
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
            const isFriend = friendsRes.data.some((f: any) => f.username === targetUser.username);
            if (isFriend) { setFriendStatus('friends'); }
            else {
                const outgoing = pendingRes.data.find((r: any) => r.friendId === targetUser.id);
                const incoming = pendingRes.data.find((r: any) => r.userId === targetUser.id);
                if (outgoing) setFriendStatus('pending');
                else if (incoming) { setFriendStatus('incoming'); setFriendRequestId(incoming.id); }
                else setFriendStatus('none');
            }
            setIsBlocked(blockRes.data.isBlocked || blockRes.data.blockedByMe);
        } catch {}
    };

    useEffect(() => { fetchProfile(); }, [searchParams, currentUser?.username]);

    const handleAcceptRequest = async () => {
        if (!friendRequestId) return;
        try { await api.post(`/friends/accept/${friendRequestId}`); setFriendStatus('friends'); setFriendRequestId(''); fetchProfile(); } catch {}
    };
    const handleFriendRequest = () => {
        requireAuth(async () => {
            if (!user) return;
            setSendingRequest(true);
            try { await api.post('/friends/request', { friendId: user.id }); setFriendStatus('pending'); }
            catch {} finally { setSendingRequest(false); }
        }, 'Log in to add friends');
    };
    const handleBlock = async () => {
        if (!user) return;
        requireAuth(async () => {
            if (!confirm(`Block @${user.username}?`)) return;
            try { await api.post(`/privacy/block/${user.id}`); setIsBlocked(true); setFriendStatus('none'); setShowMenu(false); } catch {}
        });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    if (errorCode === 403) return (
        <div className="max-w-sm mx-auto mt-24 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Access Restricted</h2>
            <p className="text-sm text-slate-400 mb-6">This profile is private or you've been blocked.</p>
            <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all">
                Return Home
            </button>
        </div>
    );

    if (!user) return (
        <div className="max-w-sm mx-auto mt-24 text-center">
            <p className="text-lg font-bold text-slate-800 dark:text-white mb-1">User Not Found</p>
            <p className="text-sm text-slate-400 mb-6">This account doesn't exist.</p>
            <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all">
                Back to Feed
            </button>
        </div>
    );

    return (
        <div>
            {/* ── HERO BLOCK: Cover + Gradient + Avatar + Info ── */}
            <div
                className="relative w-full rounded-2xl overflow-hidden mb-0 group/cover"
                style={{ minHeight: '260px' }}
            >
                {/* Background image or fallback */}
                {user.coverUrl ? (
                    <img
                        src={fixUrl(user.coverUrl)}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                        style={{ objectPosition: `center ${user.coverOffset ?? 50}%` }}
                        alt="Cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950" />
                )}

                {/* Gradient Map overlay — transparent top → dark bottom */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/80 pointer-events-none" />

                {/* ── Drag Zone (Only active in reposition mode) ── */}
                {isOwnProfile && (
                    <div 
                        ref={coverContainerRef}
                        onMouseDown={handleCoverMouseDown}
                        className={`absolute inset-0 z-0 transition-all ${repositionMode ? 'cursor-ns-resize active:cursor-grabbing bg-black/20' : 'pointer-events-none'}`}
                        title={repositionMode ? 'Drag to reposition cover' : ''}
                    >
                        {repositionMode && (
                            <div className="absolute inset-0 border-2 border-dashed border-white/30 flex items-center justify-center pointer-events-none">
                                <p className="bg-black/40 backdrop-blur-md text-white text-[10px] sm:text-xs font-medium px-4 py-2 rounded-full border border-white/10 uppercase tracking-wider">
                                    Drag photo to reposition
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Reposition Controls (Save / Cancel) */}
                {repositionMode && (
                    <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                        <button
                            onClick={handleCancelReposition}
                            className="flex items-center gap-1.5 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-bold rounded-xl transition-all border border-white/10"
                        >
                            <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button
                            onClick={handleSaveReposition}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            <Check className="w-3.5 h-3.5" /> Save Position
                        </button>
                    </div>
                )}

                {/* Back button (Hidden in reposition mode to focus) */}
                {!repositionMode && (
                    <button
                        onClick={() => router.back()}
                        className="absolute top-4 left-4 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-all z-20"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}

                {/* Action buttons — top right (visible on desktop) */}
                {!repositionMode && (
                    <div className="absolute top-4 right-4 z-30 hidden sm:flex items-center gap-2">
                        {isOwnProfile ? (
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-xl transition-all border border-white/10"
                            >
                                <Edit2 className="w-3 h-3" /> Edit Profile
                            </button>
                        ) : (
                            <>
                                {friendStatus === 'incoming' ? (
                                    <button onClick={handleAcceptRequest} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-xl transition-all active:scale-95">
                                        <Check className="w-3 h-3" /> Accept
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleFriendRequest}
                                        disabled={friendStatus === 'friends' || friendStatus === 'pending' || sendingRequest}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 border ${
                                            friendStatus === 'friends' ? 'bg-white/10 border-white/10 text-white/60 cursor-default'
                                            : friendStatus === 'pending' ? 'bg-white/10 border-white/10 text-white/50 cursor-default'
                                            : 'bg-blue-500 hover:bg-blue-400 border-transparent text-white'
                                        }`}
                                    >
                                        {friendStatus === 'friends' ? <><Check className="w-3.5 h-3.5" /> Friends</>
                                        : friendStatus === 'pending' ? <><Clock className="w-3.5 h-3.5" /> Pending</>
                                        : <><UserPlus className="w-3.5 h-3.5" /> Add Friend</>}
                                    </button>
                                )}
                                <button
                                    onClick={() => router.push(`/messages?userId=${user.id}`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-xl transition-all border border-white/10"
                                >
                                    <MessageCircle className="w-3 h-3" /> Message
                                </button>
                            </>
                        )}

                        {/* More menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            <AnimatePresence>
                                {showMenu && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                            className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-50"
                                        >
                                            {isOwnProfile && (
                                                <button
                                                    onClick={() => { 
                                                        setOriginalOffset(user?.coverOffset || 50); 
                                                        setRepositionMode(true); 
                                                        setShowMenu(false); 
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-300 font-medium border-b border-slate-100 dark:border-white/5"
                                                >
                                                    <Camera className="w-4 h-4 text-blue-400" /> Reposition Cover
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/profile/${user.username}`); setShowMenu(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-300 font-medium"
                                            >
                                                <Share2 className="w-4 h-4 text-slate-400" /> Copy Link
                                            </button>
                                            {!isOwnProfile && (
                                                <button onClick={handleBlock} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm text-red-500 font-medium">
                                                    <ShieldAlert className="w-4 h-4" /> Block User
                                                </button>
                                            )}
                                        </motion.div>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* ── Bottom info row (avatar + name + stats) ── */}
                <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-5 pt-16 pointer-events-none">
                    <div className="flex items-end gap-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0 pointer-events-auto">
                            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-[3px] border-white/80 overflow-hidden bg-slate-800 shadow-lg">
                                {user.avatarUrl ? (
                                    <img src={fixUrl(user.avatarUrl)} className="w-full h-full object-cover" alt="Avatar" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                                        {(user.displayName || user.username)[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            {isOwnProfile && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center transition-all shadow-md"
                                >
                                    <Camera className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Name + username + stats */}
                        <div className="flex-1 pb-0.5 pointer-events-auto">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <h1 className="text-lg sm:text-xl font-bold text-white leading-tight drop-shadow-sm select-text">
                                    {user.displayName || user.username}
                                </h1>
                                {user.isVerified && <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                            </div>
                            <p className="text-white/60 text-sm mb-2 select-text">@{user.username}</p>

                            {/* Stats */}
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="text-sm font-bold text-white">{user._count?.posts || 0}</span>
                                    <span className="text-white/50 text-xs ml-1">Posts</span>
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-white">{user._count?.friends || 0}</span>
                                    <span className="text-white/50 text-xs ml-1">Friends</span>
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-amber-400">{user.reputation || 0}</span>
                                    <span className="text-white/50 text-xs ml-1">Points</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile action buttons (below hero) */}
            {!repositionMode && (
                <div className="sm:hidden flex items-center gap-2 mt-3 px-1">
                    {isOwnProfile ? (
                        <button onClick={() => setShowEditModal(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all">
                            <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                        </button>
                    ) : (
                        <>
                            {friendStatus === 'incoming' ? (
                                <button onClick={handleAcceptRequest} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all active:scale-95">
                                    <Check className="w-3.5 h-3.5" /> Accept
                                </button>
                            ) : (
                                <button
                                    onClick={handleFriendRequest}
                                    disabled={friendStatus === 'friends' || friendStatus === 'pending' || sendingRequest}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl transition-all active:scale-95 ${
                                        friendStatus === 'friends' ? 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                        : friendStatus === 'pending' ? 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                >
                                    {friendStatus === 'friends' ? <><Check className="w-3.5 h-3.5" /> Friends</>
                                    : friendStatus === 'pending' ? <><Clock className="w-3.5 h-3.5" /> Pending</>
                                    : <><UserPlus className="w-3.5 h-3.5" /> Add Friend</>}
                                </button>
                            )}
                            <button onClick={() => router.push(`/messages?userId=${user.id}`)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all">
                                <MessageCircle className="w-3.5 h-3.5" /> Message
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Bio */}
            {user.bio && (
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-3 px-1">{user.bio}</p>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 dark:border-white/5 mt-4 px-1">
                {[
                    { id: 'posts', label: 'Timeline' },
                    { id: 'friends', label: 'Friends' },
                    { id: 'about', label: 'About' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {/* Timeline */}
                    {activeTab === 'posts' && (
                        <div className="space-y-4 mt-4">
                            {isOwnProfile && <CreatePost onPostCreated={fetchProfile} />}
                            {posts.length > 0 ? posts.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onDelete={fetchProfile}
                                    onClick={() => { setSelectedPost(post); setShowPostModal(true); }}
                                />
                            )) : (
                                <div className="py-16 text-center">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <ImageIcon className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500">No posts yet</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {isOwnProfile ? "Share something!" : `${user.username} hasn't posted yet.`}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Friends */}
                    {activeTab === 'friends' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {friends.length > 0 ? friends.map(friend => (
                                <Link
                                    key={friend.id}
                                    href={`/profile/${friend.username}`}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0">
                                        {friend.avatarUrl ? (
                                            <img src={fixUrl(friend.avatarUrl)} className="w-full h-full object-cover" alt={friend.username} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm">
                                                {(friend.displayName || friend.username)[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-500 transition-colors">
                                            {friend.displayName || friend.username}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">@{friend.username}</p>
                                    </div>
                                </Link>
                            )) : (
                                <div className="col-span-2 py-16 text-center">
                                    <p className="text-sm text-slate-400">No friends to show</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* About */}
                    {activeTab === 'about' && (
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/5">
                                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400">Joined</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            {isOwnProfile && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/5">
                                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-400">Email</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user.email}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/5">
                                <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400">Reputation</p>
                                    <p className="text-sm font-bold text-amber-500">{(user.reputation || 0).toLocaleString()} points</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 py-2.5">
                                <Shield className={`w-4 h-4 flex-shrink-0 ${user.isVerified ? 'text-blue-500' : 'text-slate-400'}`} />
                                <div>
                                    <p className="text-xs text-slate-400">Status</p>
                                    <p className={`text-sm font-semibold ${user.isVerified ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {user.isVerified ? 'Verified Account' : 'Standard Account'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Modals */}
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
