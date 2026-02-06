'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

import { User, Message, Conversation } from '@/types/messaging';

interface ConversationListProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (conversation: Conversation) => void;
    currentUserId: string;
}

export default function ConversationList({ conversations, selectedId, onSelect, currentUserId }: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredConversations = conversations.filter(conv => {
        const otherUser = conv.participants[0];
        const name = (otherUser.displayName || otherUser.username || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || (otherUser.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    });

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 24) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (hours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a]/40 backdrop-blur-xl border-r border-[#1e293b]">
            <div className="p-4 border-b border-[#1e293b]">
                <h1 className="text-xl font-bold text-white mb-4">Messages</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1e293b]/50 border border-[#334155] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-[#64748b]">
                        {searchQuery ? 'No results found' : 'No conversations yet'}
                    </div>
                ) : (
                    filteredConversations.map((conv) => {
                        const otherUser = conv.participants[0];
                        const isActive = selectedId === conv.id;

                        return (
                            <motion.div
                                key={conv.id}
                                whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onSelect(conv)}
                                className={`mx-2 my-1 p-3 rounded-2xl cursor-pointer transition-all relative group ${isActive
                                    ? 'bg-blue-600/20 shadow-lg shadow-blue-500/10'
                                    : 'hover:bg-[#1e293b]/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div
                                            className={`w-12 h-12 rounded-full bg-[#1e293b] bg-cover bg-center border-2 transition-all ${isActive ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-[#334155]/50 group-hover:border-[#475569]'}`}
                                            style={{ backgroundImage: otherUser.avatarUrl ? `url(${otherUser.avatarUrl})` : undefined }}
                                        />
                                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0f172a]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h3 className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-[#f1f5f9]'}`}>
                                                {otherUser.displayName || otherUser.username}
                                            </h3>
                                            {conv.lastMessageAt && (
                                                <span className={`text-[10px] ${isActive ? 'text-blue-300' : 'text-[#64748b]'}`}>
                                                    {formatTime(conv.lastMessageAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-xs truncate flex-1 ${conv.unreadCount > 0 ? 'text-blue-100 font-bold' : 'text-[#94a3b8]'}`}>
                                                {conv.id === '' ? 'Start a new conversation' : (conv.lastMessage?.content || 'Started a conversation')}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shadow-lg shadow-blue-500/30">
                                                    {conv.unreadCount}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-indicator"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"
                                    />
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
