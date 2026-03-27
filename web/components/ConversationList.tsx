'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { fixUrl } from '@/lib/utils';

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
        const name = (otherUser.displayName || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase());
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
        <div className="flex flex-col h-full bg-transparent">
            {/* ── SOFT HEADER ── */}
            <div className="pb-4 pt-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-5 tracking-tight flex items-center justify-between">
                    Messages
                </h1>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm rounded-[16px] pl-11 pr-4 py-2.5 text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
                {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-[13px] font-medium text-slate-400">
                        {searchQuery ? 'No results found' : 'No conversations yet'}
                    </div>
                ) : (
                    filteredConversations.map((conv) => {
                        const otherUser = conv.participants[0];
                        const isActive = selectedId === conv.id;

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv)}
                                className={`w-full flex items-center gap-4 py-3 px-3.5 mb-1.5 rounded-[20px] text-left transition-all duration-300 relative group
                                    ${isActive
                                        ? 'bg-white dark:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] shadow-blue-500/5 border border-slate-200/60 dark:border-slate-700'
                                        : 'bg-transparent border border-transparent hover:bg-white/60 dark:hover:bg-slate-800/40 hover:border-slate-200/50 dark:hover:border-slate-800'
                                    }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div
                                        className={`w-[52px] h-[52px] rounded-[16px] shadow-sm overflow-hidden flex items-center justify-center transition-all ${isActive ? 'rotate-3 scale-105 border-2 border-white dark:border-slate-800 blur-[0.2px]' : ''} ${conv.unreadCount > 0 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                    >
                                        <div className={`w-full h-full rounded-[16px] bg-cover bg-center ${isActive ? '-rotate-3 scale-110' : ''}`} style={otherUser.avatarUrl ? { backgroundImage: `url(${fixUrl(otherUser.avatarUrl)})` } : {}}>
                                            {!otherUser.avatarUrl && (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-lg">
                                                    {(otherUser.displayName || otherUser.username)?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-[3px] z-10 ${isActive ? 'border-white dark:border-slate-800' : 'border-slate-50 dark:border-[#0b1120] group-hover:border-white dark:group-hover:border-slate-800/40'}`} />
                                    {conv.unreadCount > 0 && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 text-white rounded-full border-[3px] border-white dark:border-[#0b1120] flex items-center justify-center text-[10px] font-bold shadow-sm z-10">{conv.unreadCount}</div>}
                                </div>
                                
                                <div className="flex-1 min-w-0 pr-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`font-bold text-[15px] truncate tracking-tight transition-colors ${conv.unreadCount > 0 ? 'text-slate-900 dark:text-white' : isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {otherUser.displayName || otherUser.username}
                                        </h3>
                                        {conv.lastMessageAt && (
                                            <span className={`text-[11px] font-bold ${conv.unreadCount > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                                                {formatTime(conv.lastMessageAt)}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-[13px] truncate font-medium ${isActive ? 'text-slate-600 dark:text-slate-300' : conv.unreadCount > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-500'}`}>
                                        {conv.id === '' ? 'Start a new conversation' : (conv.lastMessage?.content || 'Sent an attachment')}
                                    </p>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
