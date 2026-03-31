'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageCircle, Users, User, Settings, LogOut, Shield, ChevronUp, Play, Mail, Plus } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import NotificationDropdown from '@/components/NotificationDropdown';
import ThemeToggle from '@/components/ThemeToggle';
import MessageDropdown from '@/components/MessageDropdown';
import NotificationMobileIcon from '@/components/NotificationMobileIcon';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
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
            const reserved = ['login', 'register', 'admin', 'friends', 'messages', 'settings', 'terms', 'privacy', 'profile', 'api', '_next', 'short-video', 'short-videos'];

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
                { href: '/short-video', label: 'Short Video', icon: Play, protected: false },
                { href: '/email', label: 'Email', icon: Mail, protected: true },
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

    const isAuthPage = pathname === '/login' || pathname === '/register' ||
        pathname?.startsWith('/login') || pathname?.startsWith('/register');

    const isMessagesPage = pathname === '/messages' || pathname?.startsWith('/messages/');
    const isShortVideoPage = pathname === '/short-video' || pathname?.startsWith('/short-video/');

    // On auth pages, render without shell
    if (isAuthPage) {
        return (
            <>
                {children}
                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={closeAuthModal}
                    initialMode={authModalMode}
                />
            </>
        );
    }

    return (
        <div className={`min-h-[100dvh] transition-colors duration-300 ${isShortVideoPage ? 'bg-black text-white md:bg-slate-50 md:dark:bg-[#0f172a] md:text-slate-900 md:dark:text-slate-50' : 'bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-50'}`}>
            <nav className={`fixed top-0 w-full z-[100] bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 ${isShortVideoPage ? 'hidden md:block' : ''}`}>
                <div className="max-w-5xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between transition-all duration-300">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="group flex items-center transition-transform duration-300 active:scale-95 shrink-0"
                        >
                            <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                                MROHAUNG
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 ml-0.5 mt-2" />
                        </Link>

                        <div className="hidden md:flex max-w-[320px] w-80">
                            <SearchBar />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {currentUser ? (
                            <>
                                <NotificationDropdown />

                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(v => !v)}
                                        aria-label="Open user menu"
                                        className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-white/10 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden outline-none bg-slate-100 dark:bg-slate-800"
                                    >
                                        {currentUser.avatarUrl ? (
                                            <img src={fixUrl(currentUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white font-bold text-sm">
                                                {(currentUser.displayName || currentUser.username)?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {showUserMenu && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    className="absolute right-0 mt-3 w-56 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-white/5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden z-[100]"
                                                >
                                                    <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                                            {currentUser.displayName || currentUser.username}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                            @{currentUser.username}
                                                        </p>
                                                    </div>

                                                    <div className="py-1">
                                                        <Link
                                                            href={`/profile/${currentUser.username}`}
                                                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                                                            onClick={() => setShowUserMenu(false)}
                                                        >
                                                            <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                            <span className="text-slate-700 dark:text-slate-200 font-medium text-[13px]">Profile</span>
                                                        </Link>
                                                        <Link
                                                            href="/settings"
                                                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                                                            onClick={() => setShowUserMenu(false)}
                                                        >
                                                            <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                            <span className="text-slate-700 dark:text-slate-200 font-medium text-[13px]">Settings</span>
                                                        </Link>
                                                    </div>

                                                    <div className="border-t border-slate-100 dark:border-white/5 py-1">
                                                        <button
                                                            onClick={handleLogout}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                                                        >
                                                            <LogOut className="w-4 h-4 text-red-500" />
                                                            <span className="text-red-500 font-bold text-[13px]">Logout</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                                {/* Invisible overlay for clicks outside */}
                                                <div className="fixed inset-0 z-[50]" onClick={() => setShowUserMenu(false)} />
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>


                            </>

                        ) : (
                            <button
                                onClick={() => openAuthModal('login')}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <div className={`mx-auto w-full ${isShortVideoPage ? 'max-w-full px-0 pt-0 md:max-w-5xl md:px-4 md:pt-[76px]' : 'max-w-5xl px-2 sm:px-4 pt-[76px] sm:pt-20'}`}>
                <div className="flex gap-4 lg:gap-6 transition-all duration-300 w-full">
                    <aside className={`hidden md:block w-fit h-[calc(100vh-8rem)] sticky top-20 transition-all duration-300 shrink-0 ${isShortVideoPage ? 'md:block' : ''}`}>
                        <div className="h-full flex flex-col justify-between">
                            <ul className="space-y-1">
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
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${active
                                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                                                    }`}
                                            >
                                                <Icon className={`w-5 h-5 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 shrink-0'}`} />
                                                <span className="text-sm font-semibold whitespace-nowrap pr-2 lg:pr-4">{item.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </aside>

                    <main className="flex-1 min-w-0">{children}</main>
                </div>
            </div>

            {/* Floating Chat Widget - Hidden on Mobile */}
            {currentUser && (
                <div className="hidden md:block">
                    <MessageDropdown variant="floating" />
                </div>
            )}

            {/* Global Modals */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={closeAuthModal}
                initialMode={authModalMode}
            />

            {deepLinkPost && (
                <PostModal
                    isOpen={showDeepLinkModal}
                    onClose={() => {
                        setShowDeepLinkModal(false);
                        window.history.replaceState(null, '', window.location.pathname);
                    }}
                    post={deepLinkPost}
                    currentUserId={currentUser?.id}
                />
            )}

            {/* Mobile Bottom Menu Bar (TikTok Style) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[110] flex flex-row items-center justify-between px-2 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 h-14 pb-[env(safe-area-inset-bottom)]">
                {/* News / Home */}
                <Link
                    href="/"
                    className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${isActive('/') 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <Home className={`w-6 h-6 ${isActive('/') ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium mt-0.5">Home</span>
                </Link>

                {/* Short Video */}
                <Link
                    href="/short-video"
                    className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${isActive('/short-video') 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <Play className={`w-6 h-6 ${isActive('/short-video') ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium mt-0.5">Shorts</span>
                </Link>

                {/* Center Upload Button strictly for Short Video Page */}
                {isShortVideoPage && (
                    <button
                        title="Upload Video"
                        onClick={() => window.dispatchEvent(new Event('open-short-video-upload'))}
                        className="flex-1 h-full flex items-center justify-center relative z-20"
                    >
                        <div className="w-12 h-12 -translate-y-4 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.4)] border-4 border-white dark:border-[#0f172a] flex items-center justify-center active:scale-90 transition-transform">
                            <Plus className="w-7 h-7 stroke-[3]" />
                        </div>
                    </button>
                )}

                {/* Message */}
                <Link
                    href="/messages"
                    className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${isActive('/messages') 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <MessageCircle className={`w-6 h-6 ${isActive('/messages') ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium mt-0.5">Messages</span>
                </Link>

                {/* Email (Hidden if Short Video Page to keep perfectly centered) */}
                {(!isShortVideoPage) && (
                    <Link
                        href="/email"
                        className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${isActive('/email') 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <Mail className={`w-6 h-6 ${isActive('/email') ? 'fill-current' : ''}`} />
                        <span className="text-[10px] font-medium mt-0.5">Mail</span>
                    </Link>
                )}

                {/* Mobile Notification Icon using built-in /notification page routing */}
                <NotificationMobileIcon />
            </div>
        </div>
    );
}
