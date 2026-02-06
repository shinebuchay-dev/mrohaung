'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/lib/socket';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import ConversationList from '@/components/ConversationList';
import ChatWindow from '@/components/ChatWindow';

import { User, Message, Conversation } from '@/types/messaging';

function MessagesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetUserId = searchParams.get('userId');
    const { socket } = useSocket();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await api.get('/messages/conversations');
            const fetchedConversations = response.data;
            setConversations(fetchedConversations);
            setLoading(false);

            // Handle deep linking to a specific user
            if (targetUserId) {
                const existing = fetchedConversations.find((c: Conversation) =>
                    c.participants.some(p => p.id === targetUserId)
                );

                if (existing) {
                    handleSelectConversation(existing);
                } else {
                    // Fetch user info to show in the header even if no messages yet
                    try {
                        const userRes = await api.get(`/profile/${targetUserId}`);
                        const user = userRes.data;
                        // Create a temporary/placeholder conversation object
                        setSelectedConversation({
                            id: '', // Empty ID indicates new conversation
                            participants: [user],
                            lastMessage: null,
                            lastMessageAt: null,
                            unreadCount: 0
                        });
                        setMessages([]);
                    } catch (e) {
                        console.error('Error fetching target user for deep link:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (conversationId: string) => {
        try {
            await api.put(`/messages/conversations/${conversationId}/read`);
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
                )
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }, []);

    const fetchMessages = useCallback(async (conversationId: string) => {
        try {
            const response = await api.get(`/messages/conversations/${conversationId}/messages`);
            setMessages(response.data);
            await markAsRead(conversationId);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }, [markAsRead]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUserId(payload.userId);
        }
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        if (!socket) return;

        socket.on('new_message', ({ conversationId, message }) => {
            if (selectedConversation?.id === conversationId) {
                setMessages(prev => [...prev, message]);
                markAsRead(conversationId);
            }
            fetchConversations();
        });

        socket.on('user_typing', ({ userId, displayName, username, conversationId }) => {
            if (selectedConversation?.id === conversationId && userId !== currentUserId) {
                setTypingUser(displayName || username);
            }
        });

        socket.on('user_stop_typing', ({ conversationId }) => {
            if (selectedConversation?.id === conversationId) {
                setTypingUser(null);
            }
        });

        socket.on('messages_read', ({ conversationId }) => {
            if (selectedConversation?.id === conversationId) {
                setMessages(prev => prev.map(msg => ({ ...msg, read: true })));
            }
        });

        socket.on('message_reaction', ({ messageId, reactions }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, reactions } : msg
            ));
        });

        return () => {
            socket.off('new_message');
            socket.off('user_typing');
            socket.off('user_stop_typing');
            socket.off('messages_read');
        };
    }, [socket, selectedConversation, currentUserId, markAsRead, fetchConversations]);

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        fetchMessages(conversation.id);
        if (socket) {
            socket.emit('join_conversation', conversation.id);
        }
    };

    const handleSendMessage = async (content: string, file?: File | null, replyToId?: string | null, replyToContent?: string | null) => {
        if ((!content.trim() && !file) || !selectedConversation) return;

        const formData = new FormData();
        formData.append('conversationId', selectedConversation.id);
        if (content.trim()) {
            formData.append('content', content.trim());
        }
        if (file) {
            formData.append('image', file);
        }
        if (replyToId) {
            formData.append('replyToId', replyToId);
        }
        if (replyToContent) {
            formData.append('replyToContent', replyToContent);
        }

        try {
            const response = await api.post('/messages/send', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setMessages(prev => [...prev, response.data]);
            if (socket) {
                socket.emit('stop_typing', { conversationId: selectedConversation.id });
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        try {
            await api.post(`/messages/${messageId}/reaction`, { emoji });
            // The socket will handle the state update for all participants
        } catch (error) {
            console.error('Error handling reaction:', error);
        }
    };

    const handleTyping = () => {
        if (!socket || !selectedConversation) return;
        const token = localStorage.getItem('token');
        if (token) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            socket.emit('typing', {
                conversationId: selectedConversation.id,
                username: user.username,
                displayName: user.displayName
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-blue-400 font-medium animate-pulse">Loading messages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#0f172a] flex overflow-hidden">
            {/* Left Sidebar - Conversation List */}
            <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-[350px] lg:w-[400px] h-full`}>
                <ConversationList
                    conversations={conversations}
                    selectedId={selectedConversation?.id}
                    onSelect={handleSelectConversation}
                    currentUserId={currentUserId}
                />
            </div>

            {/* Right Side - Chat Window */}
            <main className={`${selectedConversation ? 'block' : 'hidden md:flex'} flex-1 h-full`}>
                <AnimatePresence mode="wait">
                    {selectedConversation ? (
                        <motion.div
                            key={selectedConversation.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full h-full"
                        >
                            <ChatWindow
                                recipient={selectedConversation.participants[0]}
                                messages={messages}
                                currentUserId={currentUserId}
                                messageInput={messageInput}
                                setMessageInput={(val) => {
                                    setMessageInput(val);
                                    handleTyping();
                                }}
                                onSendMessage={handleSendMessage}
                                typingUser={typingUser}
                                onReact={handleReaction}
                            />
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0f172a]/40 backdrop-blur-xl">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mb-6">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                >
                                    <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.827-1.213L3 21l1.657-4.582A13.854 13.854 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </motion.div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Your Messages</h2>
                            <p className="text-[#64748b] max-w-sm">
                                Send a message to start a conversation with your friends.
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-blue-400 font-medium animate-pulse">Initializing messages...</p>
                </div>
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}
