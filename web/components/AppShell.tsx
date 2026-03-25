'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageCircle, Users, User, Settings, LogOut, Shield, ChevronUp } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import NotificationDropdown from '@/components/NotificationDropdown';
import ThemeToggle from '@/components/ThemeToggle';
import MessageDropdown from '@/components/MessageDropdown';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { fixUrl } from '@/lib/utils';
import PostModal from '@/components/PostModal';
import AuthModal from '@/components/AuthModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const {
        user: currentUser,
        logout,
        updateUser,
        isAuthModalOpen,
        closeAuthModal,
        authModalMode,
        requireAuth,
        openAuthModal
    } = useAuth();

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showMessages, setShowMessages] = useState(false);
    const [recentConversations, setRecentConversations] = useState<any[]>([]);
    const [activeChatUser, setActiveChatUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [deepLinkPost, setDeepLinkPost] = useState<any>(null);
    const [showDeepLinkModal, setShowDeepLinkModal] = useState(false);

    useEffect(() => {
        if (currentUser) {
            // Fetch recent conversations for dropdown
            const fetchRecentConversations = async () => {
                try {
                    const response = await api.get('/messages/conversations?limit=5');
                    setRecentConversations(response.data || []);
                } catch (error) {
                    console.error('Failed to fetch recent conversations:', error);
                }
            };
            fetchRecentConversations();

            (async () => {
                try {
                    await api.get('/admin/overview');
                    setIsAdmin(true);
                } catch {
                    setIsAdmin(false);
                }
            })();
        }
        setIsInitialized(true);
    }, [currentUser]);

    useEffect(() => {
        const checkDeepLink = async () => {
            const pathParts = pathname?.split('/').filter(Boolean) || [];
            const reserved = ['login', 'register', 'admin', 'friends', 'messages', 'settings', 'terms', 'privacy', 'profile', 'api', '_next'];

            // Pattern: /username/postId
            if (pathParts.length === 2 && !reserved.includes(pathParts[0])) {
                const [username, postId] = pathParts;
                // Avoid re-fetching if already showing
                if (deepLinkPost?.id === postId) return;

                try {
                    const response = await api.get(`/posts/${postId}`);
                    if (response.data.author.username === username) {
                        setDeepLinkPost(response.data);
                        setShowDeepLinkModal(true);
                    }
                } catch (error) {
                    console.error('Deep link post fetch failed:', error);
                }
            } else if (pathParts.length === 0 || reserved.includes(pathParts[0])) {
                // If we navigate away from a deep link, close the modal
                if (showDeepLinkModal) {
                    setShowDeepLinkModal(false);
                }
            }
        };

        checkDeepLink();
    }, [pathname, deepLinkPost?.id, showDeepLinkModal]);

    const navItems = useMemo(
        () => {
            if (!isInitialized) return [];

            const items = [
                { href: '/', label: 'News', icon: Home },
                { href: '/friends', label: 'Friends', icon: Users, protected: true },
            ];

            if (isAdmin) {
                items.push({ href: '/admin', label: 'Admin', icon: Shield, protected: true });
            }

            // My Profile at the bottom
            items.push({ href: currentUser ? `/profile/${currentUser.username || 'user'}` : '/profile', label: 'My profile', icon: User, protected: true });

            return items;
        },
        [currentUser, isAdmin, isInitialized]
    );

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
    };

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname?.startsWith(href);
    };

    const handleSelectChatUser = async (user: any) => {
        setActiveChatUser(user);
        try {
            const convResponse = await api.get('/messages/conversations');
            const existingConv = convResponse.data.find((c: any) =>
                c.participants.some((p: any) => p.id === user.id)
            );

            if (existingConv) {
                setConversationId(existingConv.id);
                const msgResponse = await api.get(`/messages/conversations/${existingConv.id}/messages`);
                setMessages(msgResponse.data || []);
            } else {
                setConversationId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to load chat:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !activeChatUser) return;

        const content = inputMessage.trim();
        setInputMessage('');

        try {
            const response = await api.post('/messages/send', {
                recipientId: activeChatUser.id,
                content: content
            });

            const newMessage = response.data.message || {
                id: Date.now().toString(),
                content: content,
                senderId: currentUser?.id,
                createdAt: new Date().toISOString()
            };

            setMessages(prev => [...prev, newMessage]);
            if (!conversationId && response.data.conversationId) {
                setConversationId(response.data.conversationId);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isProfilePage = pathname?.startsWith('/profile');

    return (
        <div className="min-h-screen bg-[#0f172a] text-[#f8fafc]">
            <nav className="fixed top-0 w-full z-[100] bg-[#0f172a]/80 backdrop-blur-md border-b border-[#1e293b]">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-xl font-bold text-[#4a76a8] tracking-tight"
                    >
                        MROHAUNG
                    </Link>

                    <div className="hidden md:flex flex-1 max-w-sm mx-8 text-slate-800">
                        <SearchBar />
                    </div>

                    <div className="flex items-center gap-2">
                        {currentUser ? (
                            <>
                                <MessageDropdown variant="header" />
                                <NotificationDropdown />

                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(v => !v)}
                                        aria-label="Open user menu"
                                        className="w-10 h-10 rounded-full border-2 border-[#1e293b] cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                                    >
                                        {currentUser.avatarUrl ? (
                                            <img src={fixUrl(currentUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                {(currentUser.displayName || currentUser.username)?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </button>

                                    {showUserMenu && (
                                        <div className="absolute right-0 mt-2 w-56 bg-[#1e293b] border border-[#334155] rounded-2xl shadow-xl overflow-hidden z-[60]">
                                            <Link
                                                href={`/profile/${currentUser.username}`}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#334155] transition-colors"
                                                onClick={() => setShowUserMenu(false)}
                                            >
                                                <User className="w-5 h-5 text-[#94a3b8]" />
                                                <span className="text-white font-medium">Profile</span>
                                            </Link>
                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#334155] transition-colors"
                                                onClick={() => setShowUserMenu(false)}
                                            >
                                                <Settings className="w-5 h-5 text-[#94a3b8]" />
                                                <span className="text-white font-medium">Settings</span>
                                            </Link>
                                            <div className="border-t border-[#334155]" />
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-left"
                                            >
                                                <LogOut className="w-5 h-5 text-red-500" />
                                                <span className="text-red-500 font-medium">Logout</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={() => openAuthModal('login')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-4 pt-24 flex gap-6">
                <aside className="hidden lg:block w-48 h-fit sticky top-24">
                    <ul className="space-y-0.5">
                        {navItems.map((item: any) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            const handleClick = (e: React.MouseEvent) => {
                                if (item.protected) {
                                    e.preventDefault();
                                    requireAuth(() => router.push(item.href), `Log in to access ${item.label}`);
                                }
                            };

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={handleClick}
                                        className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all ${active
                                            ? 'bg-[#1e293b] text-white font-medium'
                                            : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f1f5f9]'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4 text-[#4a76a8]" />
                                        <span className="text-[14px]">{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </aside>


                <main className="flex-1 min-w-0">{children}</main>
            </div>

            {/* Global Modals */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={closeAuthModal}
                initialMode={authModalMode}
            />

            {
                deepLinkPost && (
                    <PostModal
                        isOpen={showDeepLinkModal}
                        onClose={() => setShowDeepLinkModal(false)}
                        post={deepLinkPost}
                        currentUserId={currentUser?.id}
                    />
                )
            }
        </div >
    );
}
