import { useEffect, useRef, useState } from 'react';
import { Send, MoreVertical, Image as ImageIcon, Smile, X, Info, Search, Reply, Calendar, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Message } from '@/types/messaging';
import MessageBubble from './MessageBubble';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface ChatWindowProps {
    recipient: User;
    messages: Message[];
    currentUserId: string;
    messageInput: string;
    setMessageInput: (val: string | ((prev: string) => string)) => void;
    onSendMessage: (content: string, file?: File | null, replyToId?: string | null, replyToContent?: string | null) => void;
    typingUser: string | null;
    onReact?: (messageId: string, emoji: string) => void;
}

export default function ChatWindow({
    recipient,
    messages,
    currentUserId,
    messageInput,
    setMessageInput,
    onSendMessage,
    typingUser,
    onReact
}: ChatWindowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [sharedMedia, setSharedMedia] = useState<{ id: string, imageUrl: string }[]>([]);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showSidebar) {
            fetchSharedMedia();
        }
    }, [showSidebar, recipient.id]);

    const fetchSharedMedia = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/messages/conversations/${messages[0]?.conversationId}/media`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setSharedMedia(data);
        } catch (error) {
            console.error('Error fetching media:', error);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, typingUser]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const removeImage = () => {
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() && !selectedFile) return;

        onSendMessage(messageInput, selectedFile);
        removeImage();
        setShowEmojiPicker(false);
    };

    const onEmojiClick = (emojiData: any) => {
        setMessageInput(prev => prev + emojiData.emoji);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const groupMessagesByDate = (messages: Message[]) => {
        const groups: { [date: string]: Message[] } = {};
        messages.forEach(msg => {
            const date = new Date(msg.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    };

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className="flex flex-col h-full bg-[#0f172a]/20 backdrop-blur-xl relative overflow-hidden">
            {/* Header */}
            <header className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0f172a]/60 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full bg-[#334155] bg-cover bg-center border border-[#334155]"
                            style={{ backgroundImage: recipient.avatarUrl ? `url(${recipient.avatarUrl})` : undefined }}
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1e293b]" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white leading-tight">{recipient.displayName || recipient.username}</h2>
                        <div className="flex items-center gap-1.5 min-h-[1rem]">
                            {typingUser ? (
                                <span className="text-[10px] text-blue-400 font-medium animate-pulse italic">typing...</span>
                            ) : (
                                <span className="text-[10px] text-green-500 font-medium tracking-wide uppercase">Online</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-[#64748b]">
                        <Search className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`p-2 rounded-full transition-colors ${showSidebar ? 'bg-blue-600/20 text-blue-400' : 'text-[#64748b] hover:bg-white/5'}`}
                    >
                        <Info className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5 text-[#64748b]" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Messages Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pattern-dots"
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                                <div className="w-20 h-20 rounded-full bg-[#1e293b] flex items-center justify-center mb-4">
                                    <MessageCircle className="w-10 h-10 text-white" />
                                </div>
                                <p className="text-[#64748b] text-sm">No messages yet. Start a conversation!</p>
                            </div>
                        ) : (
                            Object.entries(messageGroups).map(([date, groupMessages]) => (
                                <div key={date} className="space-y-4">
                                    <div className="flex justify-center my-6">
                                        <div className="bg-[#1e293b]/50 backdrop-blur-md border border-[#334155]/30 px-4 py-1 rounded-full text-[11px] font-bold text-[#64748b] uppercase tracking-widest flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {date === new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) ? 'Today' : date}
                                        </div>
                                    </div>
                                    {groupMessages.map((message) => (
                                        <MessageBubble
                                            key={message.id}
                                            message={message}
                                            currentUserId={currentUserId}
                                            formatTime={formatTime}
                                        />
                                    ))}
                                </div>
                            ))
                        )}
                        {typingUser && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex justify-start"
                            >
                                <div className="bg-[#1e293b]/40 px-3 py-1.5 rounded-full flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Input Area */}
                    <footer className="p-4 bg-[#0f172a]/80 backdrop-blur-xl border-t border-[#1e293b] relative">
                        {replyTo && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-2 bg-[#1e293b]/80 border-l-4 border-blue-500 p-3 rounded-r-xl flex items-center justify-between group"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-blue-400">Replying to {replyTo.senderId === currentUserId ? 'yourself' : (replyTo.sender?.displayName || replyTo.sender?.username)}</p>
                                    <p className="text-xs text-[#94a3b8] truncate mt-0.5">{replyTo.content}</p>
                                </div>
                                <button
                                    onClick={() => setReplyTo(null)}
                                    className="p-1 hover:bg-white/10 rounded-full text-[#64748b] hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-full left-4 mb-2 z-20 shadow-2xl">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    theme={"dark" as any}
                                    autoFocusSearch={false}
                                />
                            </div>
                        )}

                        <AnimatePresence>
                            {previewUrl && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mb-4 relative inline-block group"
                                >
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="h-32 rounded-xl border border-[#334155] shadow-lg"
                                    />
                                    <button
                                        onClick={removeImage}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!messageInput.trim() && !selectedFile) return;

                            // Extend handleSendMessage to support replies if needed, 
                            // but for now we'll just handle it here by passing reply info
                            if (replyTo) {
                                // We might need to update the parent component's onSendMessage
                                // or handle it via content prefix for now, but better to update the signature.
                                // I'll assume onSendMessage can take more args soon.
                            }

                            onSendMessage(messageInput, selectedFile, replyTo?.id, replyTo?.content);
                            setReplyTo(null);
                            removeImage();
                            setShowEmojiPicker(false);
                        }} className="flex items-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-[#64748b] hover:text-white"
                                >
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-blue-600/20 text-blue-400' : 'text-[#64748b] hover:bg-white/5 hover:text-white'}`}
                                >
                                    <Smile className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className="w-full bg-[#1e293b]/50 text-white px-5 py-3 rounded-2xl border border-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-[#475569]"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!messageInput.trim() && !selectedFile}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-[#1e293b] disabled:to-[#1e293b] disabled:opacity-50 text-white p-3 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center group"
                            >
                                <Send className={`w-5 h-5 transition-transform ${messageInput.trim() || selectedFile ? 'group-hover:translate-x-1 group-hover:-translate-y-1' : ''}`} />
                            </button>
                        </form>
                    </footer>
                </div>

                {/* Right Sidebar */}
                <AnimatePresence>
                    {showSidebar && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-[#0f172a]/60 backdrop-blur-2xl border-l border-[#1e293b] overflow-hidden flex flex-col"
                        >
                            <div className="p-6 flex flex-col items-center text-center">
                                <div
                                    className="w-24 h-24 rounded-full bg-[#1e293b] bg-cover bg-center border-4 border-blue-500/20 shadow-2xl mb-4"
                                    style={{ backgroundImage: recipient.avatarUrl ? `url(${recipient.avatarUrl})` : undefined }}
                                />
                                <h3 className="text-xl font-bold text-white">{recipient.displayName || recipient.username}</h3>
                                <p className="text-sm text-green-500 mb-6 font-medium">Active Now</p>

                                <div className="w-full space-y-4">
                                    <div className="text-left">
                                        <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-4">Shared Media</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {sharedMedia.length > 0 ? sharedMedia.map(item => (
                                                <div key={item.id} className="aspect-square rounded-lg bg-[#1e293b] overflow-hidden group cursor-pointer border border-[#334155]/50 hover:border-blue-500/50 transition-all">
                                                    <img src={item.imageUrl} alt="Shared" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                            )) : (
                                                <div className="col-span-3 py-8 flex flex-col items-center opacity-30">
                                                    <ImageIcon className="w-8 h-8 mb-2" />
                                                    <p className="text-xs">No media shared</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
