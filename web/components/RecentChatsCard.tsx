'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useSocket } from '@/lib/socket';
import Link from 'next/link';

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

export default function RecentChatsCard() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();
    const router = useRouter();

    const fetchConversations = async () => {
        try {
            const response = await api.get('/messages/conversations');
            setConversations(response.data.slice(0, 5));
        } catch (error) {
            console.error('Error fetching conversations for card:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();

        if (!socket) return;
        socket.on('new_message', fetchConversations);
        return () => { socket.off('new_message'); };
    }, [socket]);

    if (loading) {
        return (
            <div className="bg-[#1e293b]/50 backdrop-blur-xl rounded-3xl border border-[#334155] p-6 animate-pulse">
                <div className="h-6 w-32 bg-[#334155] rounded-lg mb-4" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                            <div className="w-10 h-10 bg-[#334155] rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-20 bg-[#334155] rounded" />
                                <div className="h-3 w-32 bg-[#334155] rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1e293b]/50 backdrop-blur-xl rounded-3xl border border-[#334155] overflow-hidden flex flex-col shadow-xl">
            <div className="p-5 border-b border-[#334155]/50 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    Recent Chats
                </h3>
            </div>

            <div className="divide-y divide-[#334155]/30">
                {conversations.length > 0 ? (
                    conversations.map((conv) => {
                        const otherUser = conv.participants[0];
                        return (
                            <Link
                                key={conv.id}
                                href="/messages"
                                className="flex items-center gap-3 p-4 hover:bg-[#334155]/50 transition-colors group"
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-[#334155] overflow-hidden border border-[#334155]">
                                        {otherUser.avatarUrl ? (
                                            <img src={otherUser.avatarUrl} alt={otherUser.displayName || otherUser.username || ''} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xs">
                                                {(otherUser.displayName || otherUser.username)?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#1e293b]">
                                            {conv.unreadCount}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                                        {otherUser.displayName || otherUser.username}
                                    </p>
                                    <p className="text-xs text-[#64748b] truncate">
                                        {conv.lastMessage?.content || 'Started a chat'}
                                    </p>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="p-8 text-center">
                        <p className="text-sm text-[#64748b]">No active chats yet</p>
                    </div>
                )}
            </div>

            <Link
                href="/messages"
                className="p-4 text-center text-sm font-semibold text-blue-500 hover:bg-[#334155]/50 transition-colors flex items-center justify-center gap-2"
            >
                Open Messages
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}
