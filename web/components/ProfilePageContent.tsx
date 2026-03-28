'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, UserPlus,
    Image as ImageIcon, MoreVertical, MessageCircle,
    Star, Check, X, ShieldAlert,
    Share2, Mail, Edit2, Clock, Camera,
    Phone, Video, Play
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
    const [shortVideos, setShortVideos] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'friends' | 'about' | 'shorts'>('posts');
    const [showEditModal, setShowEditModal] = useState(false);
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'incoming' | 'friends'>('none');
    const [friendRequestId, setFriendRequestId] = useState<string>('');
    const [sendingRequest, setSendingRequest] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showMessageMenu, setShowMessageMenu] = useState(false);
    const messageMenuRef = useRef<HTMLDivElement>(null);
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
            let urlPostId = null;

            if (!slug) {
                const parts = window.location.pathname.split('/').filter(Boolean);
                const idx = parts.indexOf('profile');
                if (idx !== -1 && parts[idx + 1]) {
                    slug = parts[idx + 1];
                    if (parts[idx + 2]) urlPostId = parts[idx + 2];
                }
            }
            if (!slug) slug = currentUser?.username;
            
            // Clean slug of @ prefix if present
            if (slug && slug.startsWith('@')) slug = slug.substring(1);
            if (!slug) { setLoading(false); return; }
            setIsOwnProfile(slug === currentUser?.username);
            const [profileRes, postsRes, shortsRes] = await Promise.all([
                api.get(`/profile/${slug}`),
                api.get(`/posts/user/${slug}`),
                api.get(`/short-videos/user/${slug}`).catch(() => ({ data: { videos: [] } }))
            ]);
            setUser(profileRes.data);
            setPosts(postsRes.data);
            setShortVideos(shortsRes.data.videos || []);

            if (urlPostId) {
                try {
                    const postRes = await api.get(`/posts/${urlPostId}`);
                    setSelectedPost(postRes.data);
                    setShowPostModal(true);
                } catch(err) { console.error('Failed to load linked post', err); }
            }

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
        } catch { }
    };

    useEffect(() => { fetchProfile(); }, [searchParams, currentUser?.username]);

    // Close message menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (messageMenuRef.current && !messageMenuRef.current.contains(e.target as Node)) {
                setShowMessageMenu(false);
            }
        };
        if (showMessageMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMessageMenu]);

    const handleAcceptRequest = async () => {
        if (!friendRequestId) return;
        try { await api.post(`/friends/accept/${friendRequestId}`); setFriendStatus('friends'); setFriendRequestId(''); fetchProfile(); } catch { }
    };
    const handleFriendRequest = () => {
        requireAuth(async () => {
            if (!user) return;
            setSendingRequest(true);
            try { await api.post('/friends/request', { friendId: user.id }); setFriendStatus('pending'); }
            catch { } finally { setSendingRequest(false); }
        }, 'Log in to add friends');
    };
    const handleBlock = async () => {
        if (!user) return;
        requireAuth(async () => {
            if (!confirm(`Block @${user.username}?`)) return;
            try { await api.post(`/privacy/block/${user.id}`); setIsBlocked(true); setFriendStatus('none'); setShowMenu(false); } catch { }
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
            {/* ── CLEAN & MINIMAL HERO: Cover extending behind Bio/Stats ── */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-white dark:bg-[#0f172a] mb-0 group min-h-[350px] sm:min-h-[415px]">
                {/* 1. The Cover Background (Clean & Natural Extension) */}
                <div className="absolute inset-x-0 top-0 h-[350px] sm:h-[415px]">
                    {user.coverUrl ? (
                        <div className="relative w-full h-full">
                            <img
                                src={fixUrl(user.coverUrl)}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ objectPosition: `center ${user.coverOffset ?? 50}%` }}
                                alt="Cover"
                            />
                            {/* Seamless Transition to Background (Transparent Fade) - Hide or fade in reposition mode */}
                            <div className={`absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-white dark:to-[#0f172a] transition-all duration-500 ${repositionMode ? 'opacity-20' : 'opacity-100'}`} />
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-100/50 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-[#0f172a]" />
                    )}
                </div>

                {/* 2. Drag Zone Overlay (Only in Reposition Mode) */}
                {isOwnProfile && repositionMode && (
                    <div
                        ref={coverContainerRef}
                        onMouseDown={handleCoverMouseDown}
                        className="absolute inset-x-0 top-0 h-[350px] sm:h-[415px] z-20 cursor-ns-resize active:cursor-grabbing bg-black/5 flex items-center justify-center transition-colors"
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="bg-white/10 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-xl border border-white/20 uppercase tracking-widest">
                                Drag photo to reposition
                            </p>
                        </div>
                    </div>
                )}

                {/* 3. Header Controls (Minimal Glass) */}
                {!repositionMode && (
                    <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between">
                        <button onClick={() => router.back()} className="w-8 h-8 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            {isOwnProfile && (
                                <button onClick={() => setShowEditModal(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-md text-white text-xs font-semibold rounded-xl border border-white/10 transition-all">
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                            <div className="relative">
                                <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                <AnimatePresence>
                                    {showMenu && (
                                        <>
                                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 p-1">
                                                {isOwnProfile && (
                                                    <button onClick={() => { setRepositionMode(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-all">
                                                        <Camera className="w-4 h-4 text-slate-400" /> Reposition Cover
                                                    </button>
                                                )}
                                                <button onClick={() => { navigator.clipboard.writeText(window.location.href); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-all">
                                                    <Share2 className="w-4 h-4 text-slate-400" /> Copy Link
                                                </button>
                                            </motion.div>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Minimal Reposition UI */}
                {repositionMode && (
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        <button onClick={handleCancelReposition} className="px-4 py-2 bg-black/40 backdrop-blur-lg text-white text-xs font-bold rounded-xl border border-white/10">Cancel</button>
                        <button onClick={handleSaveReposition} className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95">Save</button>
                    </div>
                )}

                {/* 5. Minimal Identity Section (Floating on extension) */}
                <div className="relative pt-[120px] sm:pt-[160px] px-4 pb-6 z-10 w-full">
                    <div className="flex items-center gap-4 sm:gap-6 mb-5">
                        {/* Avatar (Clean White Border) */}
                        <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-[4px] border-white dark:border-[#0f172a] overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm relative group">
                                {user.avatarUrl ? (
                                    <img src={fixUrl(user.avatarUrl)} className="w-full h-full object-cover" alt="Avatar" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold bg-slate-400 font-urbanist">
                                        {(user.displayName || user.username)[0].toUpperCase()}
                                    </div>
                                )}
                                {isOwnProfile && (
                                    <button onClick={() => setShowEditModal(true)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-6 h-6 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Identity (Aligned Center with Avatar) */}
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-[4px] mb-0.5">
                                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {user.displayName || user.username}
                                </h1>
                                {user.isVerified && (
                                    <div className="flex-shrink-0 flex items-center justify-center bg-amber-500 rounded-full w-[17px] h-[17px] mt-0.5 shadow-sm">
                                        <Check className="w-[10px] h-[10px] text-white" strokeWidth={6} />
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-400 text-sm sm:text-base font-medium opacity-80">@{user.username}</p>
                        </div>
                    </div>

                    {/* Bio & Stats (Clean Flow) */}
                    <div className="px-1 max-w-xl">
                        {user.bio ? (
                            <p className="text-[15px] sm:text-[16px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4 font-medium">
                                {user.bio}
                            </p>
                        ) : (
                            isOwnProfile && <button onClick={() => setShowEditModal(true)} className="text-sm text-blue-500 hover:underline mb-4">Add a bio...</button>
                        )}

                        <div className="flex items-center gap-6 mb-5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{user._count?.posts || 0}</span>
                                <span className="text-xs text-slate-400 font-medium">Posts</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{user._count?.friends || 0}</span>
                                <span className="text-xs text-slate-400 font-medium">Friends</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{user.reputation || 0}</span>
                                <span className="text-xs text-slate-400 font-medium">Points</span>
                            </div>
                        </div>

                        {/* Mobile Actions Overlayed */}
                        {!repositionMode && (
                            <div className="sm:hidden flex items-center gap-2 py-4 border-t border-slate-100 dark:border-white/5">
                                {isOwnProfile ? (
                                    <button onClick={() => setShowEditModal(true)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl active:scale-95 transition-all">
                                        <Edit2 className="w-4 h-4" /> Edit
                                    </button>
                                ) : (
                                    <button onClick={handleFriendRequest} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg active:scale-95 transition-all">
                                        <UserPlus className="w-4 h-4" /> Add Friend
                                    </button>
                                )}

                                {/* Message Button with Dropdown */}
                                <div className="relative flex-1" ref={messageMenuRef}>
                                    <button
                                        onClick={() => setShowMessageMenu(prev => !prev)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl active:scale-95 transition-all"
                                    >
                                        <MessageCircle className="w-4 h-4" /> Message
                                    </button>

                                    <AnimatePresence>
                                        {showMessageMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute top-full mt-2 right-0 w-52 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-1.5"
                                            >
                                                <button
                                                    onClick={() => { router.push(`/messages?userId=${user.id}`); setShowMessageMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-all"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                        <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                                                    </div>
                                                    Send Message
                                                </button>
                                                <button
                                                    onClick={() => { router.push(`/call?userId=${user.id}&type=voice`); setShowMessageMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-all"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                                        <Phone className="w-3.5 h-3.5 text-green-500" />
                                                    </div>
                                                    Voice Call
                                                </button>
                                                <button
                                                    onClick={() => { router.push(`/call?userId=${user.id}&type=video`); setShowMessageMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-all"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                                        <Video className="w-3.5 h-3.5 text-purple-500" />
                                                    </div>
                                                    Video Call
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}
                    </div>

                {/* Tabs (Integrated) */}
                    <div className="flex items-center gap-1 border-t border-slate-50 dark:border-white/5 mt-4 px-1 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'posts', label: 'Timeline' },
                            { id: 'shorts', label: 'Shorts' },
                            { id: 'friends', label: 'Friends' },
                            { id: 'about', label: 'About' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap uppercase tracking-widest text-[11px] ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
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
                                    onEdit={(post) => {
                                        setSelectedPost(post);
                                        setShowPostModal(true);
                                    }}
                                    onViewComments={(post) => {
                                        setSelectedPost(post);
                                        setShowPostModal(true);
                                        window.history.replaceState(null, '', `?post=${post.id}`);
                                    }}
                                    onClick={() => { 
                                        setSelectedPost(post); 
                                        setShowPostModal(true); 
                                        window.history.replaceState(null, '', `?post=${post.id}`);
                                    }}
                                />
                            )) : (
                                <div className="py-16 text-center">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <ImageIcon className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500">No posts yet</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {isOwnProfile ? "Share something!" : `${user?.username} hasn't posted yet.`}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Shorts */}
                    {activeTab === 'shorts' && (
                        <div className="mt-4">
                            {shortVideos.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {shortVideos.map(video => (
                                        <Link 
                                            key={video.id} 
                                            href={`/short-video/${video.id}`}
                                            className="group relative aspect-[9/16] bg-slate-900 rounded-xl overflow-hidden block"
                                        >
                                            <video 
                                                src={fixUrl(video.videoUrl)} 
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-end">
                                                <div className="flex items-center gap-1.5 text-white">
                                                    <Play className="w-4 h-4 fill-white" />
                                                    <span className="text-xs font-bold">{video.views || 0}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Video className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500">No shorts yet</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {isOwnProfile ? "Upload short videos to see them here!" : `${user?.username} hasn't uploaded any shorts yet.`}
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
                                        {user && new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            {isOwnProfile && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/5">
                                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-400">Email</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.email}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/5">
                                <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400">Reputation</p>
                                    <p className="text-sm font-bold text-amber-500">{(user?.reputation || 0).toLocaleString()} points</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 py-2.5">
                                <div className={`flex-shrink-0 flex items-center justify-center rounded-full w-[17px] h-[17px] mt-0.5 ${user?.isVerified ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                    {user?.isVerified && <Check className="w-[10.5px] h-[10.5px] text-white" strokeWidth={6} />}
                                    {!user?.isVerified && <X className="w-3 h-3 text-slate-400" />}
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Status</p>
                                    <p className={`text-sm font-semibold ${user?.isVerified ? 'text-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {user?.isVerified ? 'Verified Account' : 'Standard Account'}
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
                    onClose={() => {
                        setShowPostModal(false);
                        window.history.replaceState(null, '', window.location.pathname);
                    }}
                    post={selectedPost}
                    onDelete={() => { setShowPostModal(false); fetchProfile(); }}
                />
            )}
        </div>
    );
}
