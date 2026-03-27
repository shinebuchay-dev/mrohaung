'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageCircle, X, Clock, ChevronUp, ArrowLeft, Send, Sparkles, Users, Maximize2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { fixUrl } from '@/lib/utils';
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
    variant?: 'header' | 'sidebar' | 'floating';
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
    const router = useRouter();
    const isSidebar = variant === 'sidebar';
    const isFloating = variant === 'floating';

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
            const newMessage = res.data.message || res.data;
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
        <div className={isFloating ? "fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[90]" : `relative ${isSidebar ? 'w-full mb-2' : ''}`}>
            <AnimatePresence>
                {showDropdown && !isFloating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />
                )}
            </AnimatePresence>

            {!(isFloating && showDropdown) && (
                <button
                    onClick={() => {
                        setShowDropdown(!showDropdown);
                        if (!showDropdown) setActiveUser(null);
                    }}
                    className={
                        isFloating
                            ? `flex items-center px-4 py-3 rounded-[20px] shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95 z-50 bg-blue-600 text-white`
                            : isSidebar
                                ? `w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-all duration-300 group ${showDropdown ? 'bg-blue-600 shadow-md text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`
                                : "p-2 rounded-full hover:bg-white/5 transition-colors relative"
                    }
                >
                    {isFloating ? (
                        <div className="flex items-center gap-2">
                            <div className="relative flex items-center justify-center">
                                <MessageCircle className="w-5 h-5" />
                                {unreadTotal > 0 && (
                                    <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-blue-600">
                                        {unreadTotal > 9 ? '9+' : unreadTotal}
                                    </span>
                                )}
                            </div>
                            <span className="font-bold text-[15px]">Messages</span>
                            <ChevronUp className="w-4 h-4 ml-1 opacity-70" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 relative">
                                <div className={`transition-colors ${showDropdown ? 'text-white' : 'text-slate-400'}`}>
                                    <MessageCircle className="w-5 h-5 flex-shrink-0" />
                                </div>
                                {isSidebar && <span className="text-sm">Message</span>}
                                {unreadTotal > 0 && (
                                    <span className={`absolute -top-1 -left-1 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 ${showDropdown ? 'border-blue-600' : 'border-white dark:border-[#0f172a]'}`}>
                                        {unreadTotal > 9 ? '9+' : unreadTotal}
                                    </span>
                                )}
                            </div>
                            {isSidebar && <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-300 ${showDropdown ? 'rotate-180 opacity-100' : 'opacity-40'}`} />}
                        </>
                    )}
                </button>
            )}

            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                        className={isFloating 
                            ? `absolute bottom-0 right-0 bg-white dark:bg-[#0b1120] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden outline-none`
                            : `absolute bottom-full left-0 mb-5 bg-white dark:bg-[#0b1120] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-none z-50 flex flex-col overflow-hidden outline-none`}
                        style={{ height: '520px', maxHeight: 'calc(100vh - 8rem)', width: isFloating ? '340px' : (isSidebar ? '100%' : '320px'), maxWidth: 'calc(100vw - 2rem)' }}
                    >
                        {/* ── SOFT HEADER ── */}
                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#0b1120]">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {activeUser && (
                                    <button onClick={() => setActiveUser(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-blue-600 transition-all">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="flex flex-col truncate">
                                    <h3 className="font-bold text-[15px] text-slate-900 dark:text-white tracking-tight truncate">
                                        {activeUser ? activeUser.displayName || activeUser.username : 'Messages'}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button onClick={() => {
                                    setShowDropdown(false);
                                    router.push('/messages');
                                }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-all" title="Open Desktop Chat">
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowDropdown(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {!activeUser ? (
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-[#0b1120]">
                                {/* ── PILL TABS ── */}
                                <div className="flex px-4 pt-4">
                                    <div className="flex w-full bg-slate-100 dark:bg-slate-800/80 p-1 rounded-[16px]">
                                        <button 
                                            onClick={() => setActiveTab('recent')} 
                                            className={`flex-1 py-1.5 text-[13px] font-bold rounded-[12px] transition-all ${activeTab === 'recent' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            Recent
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab('friends')} 
                                            className={`flex-1 py-1.5 text-[13px] font-bold rounded-[12px] transition-all ${activeTab === 'friends' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            Friends
                                        </button>
                                    </div>
                                </div>

                                {/* ── FLOATING LIST ── */}
                                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
                                    {(activeTab === 'recent' ? conversations : friends).map((item: any) => {
                                        const isConv = activeTab === 'recent';
                                        const otherUser = isConv ? item.participants[0] : item;
                                        const hasUnread = isConv && item.unreadCount > 0;

                                        return (
                                            <button 
                                                key={item.id} 
                                                onClick={() => handleUserSelect(otherUser)} 
                                                className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 text-left group
                                                    ${hasUnread ? 'bg-blue-50/50 dark:bg-slate-800 border border-blue-100/50 dark:border-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'}
                                                `}
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 overflow-hidden flex items-center justify-center font-bold text-sm">
                                                        {otherUser.avatarUrl ? (
                                                            <img src={fixUrl(otherUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (otherUser.displayName || otherUser.username)?.[0]?.toUpperCase()
                                                        )}
                                                    </div>
                                                    {hasUnread && <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-[#0f172a]" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className={`text-[14px] truncate font-bold ${hasUnread ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            {otherUser.displayName || otherUser.username}
                                                        </span>
                                                        {isConv && item.lastMessage && (
                                                            <span className={`text-[11px] font-bold ${hasUnread ? 'text-blue-500' : 'text-slate-400'}`}>
                                                                {formatTime(item.lastMessage.createdAt)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-[13px] truncate font-medium ${hasUnread ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {isConv ? item.lastMessage?.content || 'Sent an attachment' : 'Start a conversation'}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-[#0b1120]">
                                {/* ── MESSAGES ── */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
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
                                        <div className="h-full flex flex-col items-center justify-center text-center px-6 opacity-60">
                                            <div className="w-16 h-16 rounded-[20px] bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                                                <MessageCircle className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-[14px] font-bold text-slate-500">Say Hello!</p>
                                        </div>
                                    )}
                                </div>

                                {/* ── FLOATING INPUT ── */}
                                <div className="p-3 bg-white dark:bg-[#0b1120] border-t border-slate-100 dark:border-slate-800">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1 pl-3 rounded-full border border-slate-200 dark:border-slate-700">
                                        <input
                                            type="text"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Write a message..."
                                            className="flex-1 bg-transparent text-[14px] font-medium text-slate-800 dark:text-white py-2 focus:outline-none placeholder:text-slate-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputText.trim()}
                                            className="w-9 h-9 flex items-center justify-center shrink-0 bg-blue-600 hover:bg-blue-700 rounded-full text-white disabled:opacity-50 transition-colors"
                                        >
                                            <Send className="w-4 h-4 ml-0.5" />
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
