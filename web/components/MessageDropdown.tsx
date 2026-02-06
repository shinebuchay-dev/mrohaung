'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageCircle, X, Clock, ChevronUp, ArrowLeft, Send, Sparkles, Users } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, User } from '@/types/messaging';
import MessageBubble from './MessageBubble';

interface Conversation {
    id: string;
    participants: {
        id: string;
        username: string;
        avatarUrl?: string;
    }[];
    lastMessage?: {
        content: string;
        createdAt: string;
    } | null;
    unreadCount: number;
}

interface MessageDropdownProps {
    onChatSelect?: (user: any) => void;
    variant?: 'header' | 'sidebar';
}

export default function MessageDropdown({ onChatSelect, variant = 'header' }: MessageDropdownProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'recent' | 'friends'>('recent');
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadTotal, setUnreadTotal] = useState(0);

    // Internal Chat State
    const [activeUser, setActiveUser] = useState<any>(null);
    const [internalMessages, setInternalMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const conversationIdRef = useRef<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { socket } = useSocket();
    const isSidebar = variant === 'sidebar';

    const fetchConversations = async () => {
        try {
            const response = await api.get('/messages/conversations');
            setConversations(response.data.slice(0, 10));
            const total = response.data.reduce((acc: number, conv: Conversation) => acc + conv.unreadCount, 0);
            setUnreadTotal(total);
        } catch (error) {
            console.error('Error fetching conversations for dropdown:', error);
        }
    };

    const fetchFriends = async () => {
        try {
            const response = await api.get('/friends');
            setFriends(response.data.slice(0, 15));
        } catch (error) {
            console.error('Error fetching friends for dropdown:', error);
        }
    };

    const fetchInternalMessages = async (recipientId: string) => {
        try {
            const convRes = await api.get(`/messages/conversations`);
            const conv = convRes.data.find((c: any) =>
                c.participants.some((p: any) => p.id === recipientId)
            );

            if (conv) {
                setConversationId(conv.id);
                conversationIdRef.current = conv.id;
                const msgRes = await api.get(`/messages/conversations/${conv.id}/messages`);
                setInternalMessages(msgRes.data);
                if (socket) socket.emit('join_conversation', conv.id);
            } else {
                setConversationId(null);
                conversationIdRef.current = null;
                setInternalMessages([]);
            }
        } catch (error) {
            console.error('Error fetching messages for dropdown chat:', error);
        }
    };

    const handleUserSelect = (user: any) => {
        setActiveUser(user);
        fetchInternalMessages(user.id);
    };

    useEffect(() => {
        if (!isSidebar) return;
        const handleOpenGlobal = (e: any) => {
            setShowDropdown(true);
            if (e.detail) handleUserSelect(e.detail);
        };
        window.addEventListener('open-chat', handleOpenGlobal);
        return () => window.removeEventListener('open-chat', handleOpenGlobal);
    }, [isSidebar]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        fetchConversations();
        fetchFriends();

        if (!socket) return;
        socket.on('new_message', (payload: any) => {
            fetchConversations();
            if (conversationIdRef.current && payload.conversationId === conversationIdRef.current) {
                setInternalMessages(prev => {
                    if (prev.some(m => m.id === payload.message.id)) return prev;
                    return [...prev, payload.message];
                });
            }
        });
        return () => { socket.off('new_message'); };
    }, [socket]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [internalMessages, activeUser]);

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const diff = new Date().getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeUser) return;
        const currentInput = inputText;
        setInputText('');
        try {
            const res = await api.post('/messages/send', {
                recipientId: activeUser.id,
                content: currentInput
            });
            const newMessage = res.data.message || {
                id: Date.now().toString(),
                content: currentInput,
                senderId: currentUser?.id,
                createdAt: new Date().toISOString(),
                sender: currentUser
            };
            setInternalMessages(prev => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });
            if (!conversationId) {
                setConversationId(res.data.conversationId);
                conversationIdRef.current = res.data.conversationId;
                if (socket) socket.emit('join_conversation', res.data.conversationId);
            }
        } catch (error) { console.error('Failed to send message:', error); }
    };

    return (
        <div className={`relative ${isSidebar ? 'w-full mb-2' : ''}`}>
            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />
                )}
            </AnimatePresence>

            <button
                onClick={() => {
                    setShowDropdown(!showDropdown);
                    if (!showDropdown) setActiveUser(null);
                }}
                className={isSidebar
                    ? `w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${showDropdown ? 'bg-blue-600 shadow-lg text-white' : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'}`
                    : "p-2 rounded-full hover:bg-white/5 transition-colors relative"
                }
            >
                <div className="flex items-center gap-3 relative">
                    <div className={`p-1.5 rounded-xl ${showDropdown ? 'bg-white/20' : 'bg-blue-500/10'}`}>
                        <MessageCircle className={`w-4 h-4 ${showDropdown ? 'text-white' : 'text-blue-500'}`} />
                    </div>
                    {isSidebar && <span className="text-[13px] font-bold">Messages</span>}
                    {unreadTotal > 0 && (
                        <span className="absolute -top-1 -left-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-[#1e293b]">
                            {unreadTotal > 9 ? '9+' : unreadTotal}
                        </span>
                    )}
                </div>
                {isSidebar && <ChevronUp className={`w-3.5 h-3.5 opacity-40 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />}
            </button>

            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: isSidebar ? -5 : 5 }}
                        animate={{ opacity: 1, scale: 1, y: isSidebar ? -10 : 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: isSidebar ? -5 : 5 }}
                        className={`absolute ${isSidebar ? 'top-[calc(100%+8px)] left-0' : 'right-0 mt-2'} bg-[#1a2233] border border-white/5 rounded-[20px] shadow-2xl z-50 flex flex-col overflow-hidden`}
                        style={{ height: '440px', width: isSidebar ? '100%' : '300px' }}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                {activeUser && (
                                    <button onClick={() => setActiveUser(null)} className="p-1.5 hover:bg-white/5 rounded-lg">
                                        <ArrowLeft className="w-4 h-4 text-[#94a3b8]" />
                                    </button>
                                )}
                                <div className="flex flex-col truncate">
                                    <h3 className="font-bold text-[13px] text-white truncate">
                                        {activeUser ? activeUser.displayName || activeUser.username : 'Messages'}
                                    </h3>
                                    {activeUser && <span className="text-[9px] text-green-500 font-bold uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Online</span>}
                                </div>
                            </div>
                            <button onClick={() => setShowDropdown(false)} className="p-1.5 hover:bg-white/5 rounded-lg">
                                <X className="w-4 h-4 text-[#64748b]" />
                            </button>
                        </div>

                        {!activeUser ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Density Tabs */}
                                <div className="flex gap-1 p-1 bg-black/20 mx-3 mt-3 rounded-lg border border-white/5">
                                    <button onClick={() => setActiveTab('recent')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'recent' ? 'bg-[#334155] text-white' : 'text-[#64748b]'}`}>Recent</button>
                                    <button onClick={() => setActiveTab('friends')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'friends' ? 'bg-[#334155] text-white' : 'text-[#64748b]'}`}>Friends</button>
                                </div>
                                <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar px-1.5 pb-3">
                                    {(activeTab === 'recent' ? conversations : friends).map((item: any) => {
                                        const isConv = activeTab === 'recent';
                                        const otherUser = isConv ? item.participants[0] : item;
                                        return (
                                            <button key={item.id} onClick={() => handleUserSelect(otherUser)} className={`w-full flex items-center gap-3 p-2.5 mb-0.5 rounded-xl hover:bg-white/5 text-left group`}>
                                                <div className="w-8 h-8 rounded-lg bg-[#334155] overflow-hidden">
                                                    {otherUser.avatarUrl ? <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-600/20 text-blue-400 font-bold text-xs">{(otherUser.displayName || otherUser.username)?.[0]?.toUpperCase()}</div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="font-bold text-[12px] text-white/90 truncate">{otherUser.displayName || otherUser.username}</span>
                                                        {isConv && item.lastMessage && <span className="text-[9px] text-[#64748b]">{formatTime(item.lastMessage.createdAt)}</span>}
                                                    </div>
                                                    <p className={`text-[11px] truncate ${isConv && item.unreadCount > 0 ? 'text-blue-400 font-bold' : 'text-[#64748b]'}`}>
                                                        {isConv ? item.lastMessage?.content || 'New message' : item.lastMessage?.content || ''}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col bg-black/5 overflow-hidden">
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {internalMessages.length > 0 ? (
                                        internalMessages.map((msg) => (
                                            <MessageBubble
                                                key={msg.id}
                                                message={msg}
                                                currentUserId={currentUser?.id}
                                                formatTime={(d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            />
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                                            <Sparkles className="w-8 h-8 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest leading-none">Encrypted</p>
                                        </div>
                                    )}
                                </div>

                                {/* Compact Sticky Input */}
                                <div className="p-2.5 mt-auto bg-white/5 border-t border-white/5">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-[#0f172a] p-1 pr-1 pl-3 rounded-xl border border-white/5 focus-within:border-blue-500/30 transition-all">
                                        <input
                                            type="text"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-transparent text-[11px] text-white py-1.5 focus:outline-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputText.trim()}
                                            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white disabled:opacity-20 active:scale-95"
                                        >
                                            <Send className="w-3 h-3" />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
