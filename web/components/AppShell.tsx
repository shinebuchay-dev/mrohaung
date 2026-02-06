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

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showMessages, setShowMessages] = useState(false);
    const [recentConversations, setRecentConversations] = useState<any[]>([]);
    const [activeChatUser, setActiveChatUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const syncUser = async () => {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            setCurrentUser(user);

            if (user && (user.id || user.username)) {
                // Fetch latest user data to sync localStorage
                try {
                    const profileRes = await api.get(`/profile/${user.id || user.username}`);
                    const latestUser = profileRes.data;
                    localStorage.setItem('user', JSON.stringify({ ...user, ...latestUser }));
                    setCurrentUser({ ...user, ...latestUser });
                } catch (err) {
                    console.error('Failed to sync user data:', err);
                }

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
        };

        const handleUpdate = () => {
            const updated = JSON.parse(localStorage.getItem('user') || 'null');
            setCurrentUser(updated);
        };

        syncUser().finally(() => setIsInitialized(true));
        window.addEventListener('userUpdated', handleUpdate);

        return () => window.removeEventListener('userUpdated', handleUpdate);
    }, []);

    const navItems = useMemo(
        () => {
            if (!isInitialized) return [];

            if (!currentUser) {
                return [
                    { href: '/', label: 'Feed', icon: Home },
                    { href: '/login', label: 'Login', icon: LogOut },
                ];
            }

            const items = [
                { href: '/', label: 'Home', icon: Home },
                { href: '/friends', label: 'Friends', icon: Users },
                { href: currentUser ? `/profile/${currentUser.username}` : '#', label: 'Profile', icon: User },
            ];

            if (isAdmin) {
                items.push({ href: '/admin', label: 'Admin', icon: Shield });
            }

            return items;
        },
        [currentUser, isAdmin, isInitialized]
    );

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
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

    return (
        <div className="min-h-screen bg-[#0f172a] text-[#f8fafc]">
            <nav className="fixed top-0 w-full z-[1000] bg-[#0f172a]/80 backdrop-blur-md border-b border-[#1e293b]">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-2xl font-black bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent italic tracking-tighter"
                    >
                        MROHAUNG
                    </Link>

                    <div className="hidden md:flex flex-1 mx-8">
                        <SearchBar />
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />

                        {currentUser ? (
                            <>
                                <NotificationDropdown />

                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu((v) => !v)}
                                        aria-label="Open user menu"
                                        className="w-10 h-10 rounded-full border-2 border-[#1e293b] cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                                    >
                                        {currentUser.avatarUrl ? (
                                            <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
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
                            <Link href="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-4 pt-24 flex gap-8">
                <aside className="hidden lg:block w-64 h-fit sticky top-24">
                    <ul className="space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${active
                                            ? 'bg-blue-600/10 text-blue-500 font-bold'
                                            : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-white'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-base">{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Messages - Custom Dropdown (Only for logged in users) */}
                    {currentUser && (
                        <div className="mt-4 pt-4 border-t border-[#334155]/50 relative">
                            <button
                                onClick={() => setShowMessages(!showMessages)}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${pathname?.startsWith('/messages')
                                    ? 'bg-blue-600/10 text-blue-500 font-bold'
                                    : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-white'
                                    }`}
                            >
                                <MessageCircle className="w-5 h-5" />
                                <span className="text-base flex-1 text-left">Messages</span>
                                <ChevronUp className={`w-4 h-4 transition-transform ${showMessages ? '' : 'rotate-180'}`} />
                            </button>

                            {showMessages && (
                                <div className="mt-2 bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden">
                                    {!activeChatUser ? (
                                        // Conversation List
                                        <>
                                            <Link
                                                href="/messages"
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#334155]/50 transition-colors text-sm text-[#94a3b8] hover:text-white border-b border-[#334155]/50"
                                                onClick={() => setShowMessages(false)}
                                            >
                                                <span>View All Messages</span>
                                            </Link>
                                            {recentConversations.length > 0 ? (
                                                recentConversations.map((conv: any) => {
                                                    const otherUser = conv.participants?.[0];
                                                    return (
                                                        <button
                                                            key={conv.id}
                                                            onClick={() => handleSelectChatUser(otherUser)}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#334155]/50 transition-colors text-left"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{otherUser?.displayName || otherUser?.username}</p>
                                                                <p className="text-xs text-[#64748b] truncate">{conv.lastMessage?.content || 'No messages yet'}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="px-4 py-3 text-xs text-[#64748b]">
                                                    No recent conversations
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        // Active Chat Interface
                                        <div className="flex flex-col h-80">
                                            {/* Chat Header */}
                                            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#334155]/50 bg-[#334155]/20">
                                                <button
                                                    onClick={() => setActiveChatUser(null)}
                                                    className="p-1 hover:bg-[#334155] rounded-lg text-[#94a3b8]"
                                                >
                                                    <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                                                </button>
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600" />
                                                <span className="text-sm font-medium text-white flex-1 truncate">
                                                    {activeChatUser.displayName || activeChatUser.username}
                                                </span>
                                            </div>

                                            {/* Messages */}
                                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                                {messages.length === 0 ? (
                                                    <div className="h-full flex items-center justify-center text-xs text-[#64748b]">
                                                        Start a conversation...
                                                    </div>
                                                ) : (
                                                    messages.map((msg: any) => (
                                                        <div
                                                            key={msg.id}
                                                            className={`flex ${msg.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div
                                                                className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${msg.senderId === currentUser?.id
                                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                                    : 'bg-[#334155] text-white rounded-bl-none'
                                                                    }`}
                                                            >
                                                                <p>{msg.content}</p>
                                                                <span className="text-[9px] opacity-70 mt-1 block">
                                                                    {formatTime(msg.createdAt)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Input */}
                                            <form onSubmit={handleSendMessage} className="p-2 border-t border-[#334155]/50">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={inputMessage}
                                                        onChange={(e) => setInputMessage(e.target.value)}
                                                        placeholder="Type a message..."
                                                        className="flex-1 bg-[#334155]/50 border border-[#334155] rounded-lg px-3 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-blue-500"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!inputMessage.trim()}
                                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
                                                    >
                                                        Send
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </aside>

                <div className="flex-1 min-w-0">{children}</div>
            </div>
        </div>
    );
}
