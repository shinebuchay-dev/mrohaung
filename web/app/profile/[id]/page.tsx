'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Edit2, UserPlus, UserCheck, Image as ImageIcon, Loader2, Ban, MoreVertical, MessageCircle, Star, Check, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import EditProfileModal from '@/components/EditProfileModal';
import MessageDropdown from '@/components/MessageDropdown';
import NotificationDropdown from '@/components/NotificationDropdown';
import ThemeToggle from '@/components/ThemeToggle';
import AppShell from '@/components/AppShell';
import RecentChatsCard from '@/components/RecentChatsCard';
import FriendSuggestions from '@/components/FriendSuggestions';
import CreatePost from '@/components/CreatePost';
import PostModal from '@/components/PostModal';

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

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'incoming' | 'friends'>('none');
    const [friendRequestId, setFriendRequestId] = useState<string>('');
    const [sendingRequest, setSendingRequest] = useState(false);
    const [friendError, setFriendError] = useState<string>('');
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockedByMe, setBlockedByMe] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [showPostModal, setShowPostModal] = useState(false);

    // States and Refs for direct photo selection
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [initialAvatar, setInitialAvatar] = useState<File | null>(null);
    const [initialCover, setInitialCover] = useState<File | null>(null);

    // Repositioning states
    const [isRepositioning, setIsRepositioning] = useState(false);
    const [repositionOffset, setRepositionOffset] = useState(50);
    const [tempCoverPreview, setTempCoverPreview] = useState<string | null>(null);
    const [tempCoverFile, setTempCoverFile] = useState<File | null>(null);
    const [isSavingCover, setIsSavingCover] = useState(false);

    const dragStartY = useRef<number | null>(null);
    const startOffset = useRef<number>(50);

    const fetchProfile = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            setCurrentUser(storedUser);
            const profileSlug = (params.id as string) || storedUser.username;

            if (!profileSlug || profileSlug === '[id]') {
                return;
            }

            setIsOwnProfile(profileSlug === storedUser.username);

            const [profileRes, postsRes] = await Promise.all([
                api.get(`/profile/${profileSlug}`),
                api.get(`/posts/feed`) // We'll filter by user on frontend for now
            ]);

            setUser(profileRes.data);
            // Filter posts by this user
            setPosts(postsRes.data.filter((post: Post) => post.author.username === profileRes.data.username));

            // Check friend status if not own profile
            if (profileSlug !== storedUser.username) {
                try {
                    // Check accepted friends
                    const friendsRes = await api.get('/friends');
                    const friends = friendsRes.data;
                    const isFriend = friends.some((f: any) => f.username === profileRes.data.username);
                    if (isFriend) {
                        setFriendStatus('friends');
                    } else {
                        // Check pending requests (both directions)
                        const pendingRes = await api.get('/friends/requests');
                        const pending = pendingRes.data;

                        console.log('Friend request debug:', {
                            currentUserId: storedUser.id,
                            profileUserId: profileRes.data.id,
                            pendingRequests: pending
                        });

                        // Debug: show first pending request details
                        if (pending.length > 0) {
                            console.log('First pending request details:', pending[0]);
                        }

                        // Outgoing: current user sent to profile user
                        const outgoing = pending.find((r: any) => r.userId === storedUser.id && r.friendId === profileRes.data.id);
                        // Incoming: profile user sent to current user
                        const incoming = pending.find((r: any) => r.userId === profileRes.data.id && r.friendId === storedUser.id);

                        console.log('Found requests:', { outgoing, incoming });

                        if (outgoing) {
                            setFriendStatus('pending');
                        } else if (incoming) {
                            setFriendStatus('incoming');
                            setFriendRequestId(incoming.id);
                        } else {
                            setFriendStatus('none');
                        }
                    }
                } catch (error) {
                    console.error('Failed to check friend status:', error);
                }

                // Check if user is blocked
                try {
                    const blockRes = await api.get(`/privacy/check-blocked/${profileRes.data.id}`);
                    setIsBlocked(blockRes.data.isBlocked);
                    setBlockedByMe(blockRes.data.blockedByMe);
                } catch (error) {
                    console.error('Failed to check block status:', error);
                }
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async () => {
        if (!friendRequestId) return;
        try {
            await api.post(`/friends/accept/${friendRequestId}`);
            setFriendStatus('friends');
            setFriendRequestId('');
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Failed to accept request';
            setFriendError(msg);
        }
    };
    const handleFriendRequest = async () => {
        if (!user) return;

        setSendingRequest(true);
        setFriendError('');
        try {
            await api.post('/friends/request', { friendId: user.id });
            setFriendStatus('pending');
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Failed to send friend request';
            setFriendError(msg);
            console.error('Failed to send friend request:', error);
        } finally {
            setSendingRequest(false);
        }
    };

    const handleBlock = async () => {
        if (!user) return;
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
    };

    const handleUnblock = async () => {
        if (!user) return;

        try {
            await api.delete(`/privacy/unblock/${user.id}`);
            setIsBlocked(false);
            setBlockedByMe(false);
            setShowMenu(false);
        } catch (error) {
            console.error('Failed to unblock user:', error);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [params.id]);

    const handleAvatarClick = () => {
        avatarInputRef.current?.click();
    };

    const handleCoverClick = () => {
        coverInputRef.current?.click();
    };

    const onAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setInitialAvatar(file);
            setInitialCover(null);
            setShowEditModal(true);
        }
    };

    const onCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const options = {
                    maxSizeMB: 0.8,
                    maxWidthOrHeight: 1500,
                    useWebWorker: true,
                    fileType: 'image/jpeg'
                };
                const compressedFile = await imageCompression(file, options);
                setTempCoverFile(compressedFile);
                setTempCoverPreview(URL.createObjectURL(compressedFile));
                setRepositionOffset(50);
                setIsRepositioning(true);
            } catch (error) {
                console.error('Error compressing cover:', error);
            }
        }
    };

    const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isRepositioning) return;

        // Don't drag if clicking buttons or links
        if ((e.target as HTMLElement).closest('button, a, input')) return;

        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        dragStartY.current = y;
        startOffset.current = repositionOffset;
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isRepositioning || dragStartY.current === null) return;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const delta = y - dragStartY.current;

        // sensitivity adjustment
        const newOffset = startOffset.current - (delta / 2);
        setRepositionOffset(Math.max(0, Math.min(100, newOffset)));
    };

    const handleStopDrag = () => {
        dragStartY.current = null;
    };

    const saveRepositionedCover = async () => {
        if (!user || (!tempCoverFile && repositionOffset === user.coverOffset)) return;

        setIsSavingCover(true);
        const formData = new FormData();
        if (tempCoverFile) {
            formData.append('cover', tempCoverFile);
        }
        formData.append('coverOffset', repositionOffset.toString());
        formData.append('bio', user.bio || ''); // Keep current bio

        try {
            const response = await api.put('/profile', formData);
            const updatedUser = response.data;
            if (updatedUser) {
                const currentLocalUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...currentLocalUser, ...updatedUser }));
                window.dispatchEvent(new Event('userUpdated'));
                setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            }
            setIsRepositioning(false);
            setTempCoverFile(null);
            setTempCoverPreview(null);
        } catch (error) {
            console.error('Failed to save cover:', error);
        } finally {
            setIsSavingCover(false);
        }
    };

    const cancelRepositioning = () => {
        setIsRepositioning(false);
        setTempCoverFile(null);
        setTempCoverPreview(null);
        setRepositionOffset(user?.coverOffset ?? 50);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">User not found</h2>
                    <button
                        onClick={() => router.push('/')}
                        className="text-blue-500 hover:underline"
                    >
                        Go back home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AppShell>
            {/* Cover Photo Container - Boxed like the original */}
            <div
                className={`relative h-48 sm:h-72 overflow-hidden transition-all bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 ${isRepositioning ? 'cursor-move ring-4 ring-blue-500 ring-inset shadow-2xl' : ''}`}
                onMouseDown={handleStartDrag}
                onMouseMove={handleDragMove}
                onMouseUp={handleStopDrag}
                onMouseLeave={handleStopDrag}
                onTouchStart={handleStartDrag}
                onTouchMove={handleDragMove}
                onTouchEnd={handleStopDrag}
            >
                {(tempCoverPreview || user.coverUrl) && (
                    <img
                        src={tempCoverPreview || user.coverUrl}
                        alt="Cover"
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 group-hover:scale-105"
                        style={{ objectPosition: `50% ${isRepositioning ? repositionOffset : (user.coverOffset ?? 50)}%` }}
                    />
                )}
                {/* Ultra-soft Premium Gradients for depth and readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/20 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/5 transition-opacity duration-500 pointer-events-none" />

                {/* Cover Actions Overlay */}
                {isOwnProfile && (
                    <div className="absolute inset-0 z-20">
                        {isRepositioning ? (
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <button
                                    onClick={cancelRepositioning}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 px-4 shadow-xl"
                                >
                                    <X className="w-5 h-5" />
                                    <span className="text-sm font-bold">Cancel</span>
                                </button>
                                <button
                                    onClick={saveRepositionedCover}
                                    disabled={isSavingCover}
                                    className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl backdrop-blur-md border border-blue-400/50 transition-all flex items-center gap-2 px-4 shadow-lg shadow-blue-500/20"
                                >
                                    {isSavingCover ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    <span className="text-sm font-bold">{isSavingCover ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="absolute top-4 right-4 flex items-center gap-2 scale-90 group-hover:scale-100 transition-transform origin-top-right">
                                {user.coverUrl && (
                                    <button
                                        onClick={() => {
                                            setRepositionOffset(user.coverOffset ?? 50);
                                            setIsRepositioning(true);
                                        }}
                                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all shadow-lg group/btn"
                                        title="Reposition Photo"
                                    >
                                        <Edit2 className="w-4 h-4 transition-transform group-hover/btn:rotate-12" />
                                    </button>
                                )}
                                <div className="relative">
                                    <input
                                        type="file"
                                        ref={coverInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={onCoverFileChange}
                                    />
                                    <button
                                        onClick={handleCoverClick}
                                        className="p-2.5 bg-white/20 hover:bg-blue-600 text-white rounded-xl backdrop-blur-md border border-white/30 transition-all shadow-xl group/upload"
                                        title="Change Cover Photo"
                                    >
                                        <ImageIcon className="w-5 h-5 transition-transform group-hover/upload:scale-110" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {isRepositioning && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600/90 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-widest pointer-events-none shadow-xl">
                                Drag to Reposition
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Profile Info Section */}
            <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6">
                <div className="flex items-start gap-4 -mt-10 sm:-mt-14 mb-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0 z-20">
                        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[#0f172a] bg-[#1e293b] overflow-hidden shadow-2xl ring-2 ring-white/5">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.displayName || user.username || ''} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                    <span className="text-3xl sm:text-4xl font-bold text-white">{(user.displayName || user.username)?.[0]?.toUpperCase() || 'U'}</span>
                                </div>
                            )}
                        </div>
                        {isOwnProfile && (
                            <div className="absolute -bottom-1 right-0.5 z-30">
                                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={onAvatarFileChange} />
                                <button onClick={handleAvatarClick} className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full transition-all shadow-lg border-2 border-[#0f172a]">
                                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Name and Button - Right Side */}
                    <div className="flex-1 min-w-0 pt-8 sm:pt-10">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex flex-col">
                                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words leading-tight">{user.displayName || user.username}</h2>
                                        {user.displayName && <p className="text-sm text-[#64748b] font-medium tracking-wide">@{user.username}</p>}
                                    </div>
                                    {/* Reputation Badge */}
                                    {(user.reputation || 0) > 10 && (
                                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit h-fit mt-1 ${(user.reputation || 0) > 100 ? 'bg-yellow-500/10 text-yellow-400' :
                                            (user.reputation || 0) > 50 ? 'bg-purple-500/10 text-purple-400' :
                                                'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            {(user.reputation || 0) > 100 ? 'Legend' :
                                                (user.reputation || 0) > 50 ? 'Community Pillar' :
                                                    'Rising Star'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons (excluding Edit Profile) */}
                            <div className="flex flex-wrap items-center gap-2">
                                {!isOwnProfile && (
                                    <>
                                        {isBlocked ? (
                                            <button
                                                onClick={handleUnblock}
                                                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Ban className="w-4 h-4" />
                                                Unblock
                                            </button>
                                        ) : (
                                            <>
                                                {friendStatus === 'friends' ? (
                                                    <button className="px-4 py-2.5 bg-[#334155] hover:bg-[#475569] rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5">
                                                        <UserCheck className="w-4 h-4" />
                                                        Friends
                                                    </button>
                                                ) : friendStatus === 'incoming' ? (
                                                    <button
                                                        onClick={handleAcceptRequest}
                                                        className="px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                        Accept
                                                    </button>
                                                ) : friendStatus === 'pending' ? (
                                                    <button
                                                        disabled
                                                        className="px-4 py-2.5 bg-[#334155] rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
                                                    >
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Sent
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleFriendRequest}
                                                        disabled={sendingRequest}
                                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        {sendingRequest ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <UserPlus className="w-4 h-4" />
                                                        )}
                                                        {sendingRequest ? '...' : 'Add Friend'}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('open-chat', { detail: user }));
                                                    }}
                                                    className="p-2.5 bg-[#1e293b] hover:bg-[#334155] rounded-xl transition-colors"
                                                    title="Message"
                                                >
                                                    <MessageCircle className="w-5 h-5 text-blue-400" />
                                                </button>

                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowMenu(!showMenu)}
                                                        className="p-2.5 bg-[#334155] hover:bg-[#475569] rounded-xl transition-colors"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>

                                                    {showMenu && (
                                                        <div className="absolute right-0 mt-1.5 w-44 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl overflow-hidden z-10 py-1">
                                                            <button
                                                                onClick={handleBlock}
                                                                className="w-full px-3 py-2.5 text-left hover:bg-red-500/10 transition-colors flex items-center gap-2 text-red-500 text-sm font-semibold"
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                                Block User
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats and Bio */}
            <div className="px-4 sm:px-6 pb-4">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm font-medium mb-3">
                    <div className="flex items-center gap-1.5 text-[#94a3b8] bg-[#1e293b] px-2 py-0.5 rounded-lg">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-white font-bold">{user.reputation || 0}</span>
                        <span className="text-xs">Rep</span>
                    </div>
                </div>

                {user.bio && (
                    <p className="text-sm text-[#94a3b8] max-w-2xl mb-4 leading-relaxed">{user.bio}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#64748b]">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#64748b]" />
                        <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5 text-[#64748b]" />
                        <span className="font-semibold text-white">{user._count.posts}</span>
                        <span>{user._count.posts === 1 ? 'Post' : 'Posts'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#64748b]" />
                        <span className="font-semibold text-white">{user._count.friends}</span>
                        <span>{user._count.friends === 1 ? 'Friend' : 'Friends'}</span>
                    </div>
                </div>
            </div>

            {/* Tabs - Mobile Optimized */}
            <div className="flex gap-4 sm:gap-6 px-4 sm:px-6 pb-3">
                {[
                    { id: 'posts', label: 'Posts' },
                    { id: 'about', label: 'About' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === tab.id ? 'text-blue-400' : 'text-[#64748b] hover:text-[#94a3b8]'}`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Dashboard Layout: Feed + Sidebar - Compact */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                {/* Main Content Area */}
                <div className="min-w-0">
                    {activeTab === 'posts' ? (
                        <div className="space-y-5">
                            {isOwnProfile && (
                                <CreatePost onPostCreated={(newPost) => {
                                    if (newPost) {
                                        const normalized = {
                                            ...newPost,
                                            _count: { likes: 0, comments: 0 },
                                            author: { ...newPost.author, id: newPost.authorId }
                                        };
                                        setPosts(prev => [normalized, ...prev]);
                                    } else {
                                        fetchProfile();
                                    }
                                }} />
                            )}
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        isGuest={!currentUser}
                                        onDelete={fetchProfile}
                                        onUpdate={fetchProfile}
                                        onEdit={(p) => {
                                            setSelectedPost(p);
                                            setShowPostModal(true);
                                        }}
                                        onViewComments={(p) => {
                                            if (!currentUser && !isOwnProfile) return;
                                            setSelectedPost(p);
                                            setShowPostModal(true);
                                        }}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-16 bg-[#1e293b]/20 rounded-2xl border border-dashed border-[#334155]/50 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center border border-[#334155]">
                                        <ImageIcon className="w-6 h-6 text-[#334155]" />
                                    </div>
                                    <p className="text-sm text-[#64748b] font-medium">No posts yet</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[#1e293b]/30 border border-[#334155]/60 rounded-2xl p-6 shadow-lg">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="font-bold text-lg">About {user.displayName || user.username}</h3>
                                {isOwnProfile && (
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-[#94a3b8]">
                                    <div className="w-9 h-9 bg-[#1e293b] rounded-lg flex items-center justify-center border border-[#334155]/50 flex-shrink-0">
                                        <Ban className="w-4 h-4 text-[#64748b]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Email</p>
                                        <p className="text-sm text-white truncate">{user.email}</p>
                                    </div>
                                </div>
                                {user.bio && (
                                    <div className="flex items-start gap-3 text-[#94a3b8]">
                                        <div className="w-9 h-9 bg-[#1e293b] rounded-lg flex items-center justify-center border border-[#334155]/50 flex-shrink-0">
                                            <Edit2 className="w-4 h-4 text-[#64748b]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Bio</p>
                                            <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{user.bio}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Compact */}
                <aside className="hidden xl:block">
                    <div className="sticky top-20 space-y-4">
                        <FriendSuggestions />
                    </div>
                </aside>
            </div>

            {/* Edit Profile Modal */}
            <EditProfileModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setInitialAvatar(null);
                    setInitialCover(null);
                }}
                currentUser={currentUser}
                onUpdate={fetchProfile}
                initialAvatar={initialAvatar}
                initialCover={initialCover}
            />

            {selectedPost && (
                <PostModal
                    isOpen={showPostModal}
                    onClose={() => {
                        setShowPostModal(false);
                        setSelectedPost(null);
                    }}
                    post={selectedPost}
                    currentUserId={currentUser?.id}
                    onUpdate={fetchProfile}
                    onDelete={fetchProfile}
                />
            )}
        </AppShell>
    );
}
