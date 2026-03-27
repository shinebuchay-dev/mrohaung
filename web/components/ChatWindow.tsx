import { useEffect, useRef, useState } from 'react';
import { Send, MoreVertical, Image as ImageIcon, Smile, X, Info, Search, Reply, Calendar, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Message } from '@/types/messaging';
import MessageBubble from './MessageBubble';
import dynamic from 'next/dynamic';
import { fixUrl } from '@/lib/utils';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import { API_URL } from '@/lib/config';

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
            const response = await fetch(`${API_URL}/messages/conversations/${messages[0]?.conversationId}/media`, {
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
        <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
            {/* ── SOFT HEADER ── */}
            <header className="pb-4 pt-1 flex items-center justify-between z-10 border-b border-slate-200 dark:border-slate-800/60">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 bg-cover bg-center border border-white dark:border-slate-700 shadow-sm"
                            style={{ backgroundImage: recipient.avatarUrl ? `url(${fixUrl(recipient.avatarUrl)})` : undefined }}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#0b1120]" />
                    </div>
                    <div>
                        <h2 className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight">
                            {recipient.displayName || recipient.username}
                        </h2>
                        <div className="flex items-center gap-1.5 min-h-[1rem]">
                            {typingUser ? (
                                <span className="text-[11px] text-blue-500 font-medium animate-pulse">typing...</span>
                            ) : (
                                <span className="text-[11px] text-slate-500 font-medium">Active now</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                        <Search className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`p-2 rounded-full transition-all ${showSidebar ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                    >
                        <Info className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
                {/* ── MESSAGES OZONE ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-transparent">
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto pt-2 pb-4 space-y-2 custom-scrollbar"
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-70 select-none">
                                <div className="w-16 h-16 bg-white dark:bg-slate-800 shadow-sm rounded-full flex items-center justify-center mb-4 hover:-translate-y-1 transition-transform border border-slate-100 dark:border-slate-700/50">
                                    <MessageCircle className="w-7 h-7 text-slate-300 dark:text-slate-500" />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-[14px] font-medium">Say Hello!</p>
                            </div>
                        ) : (
                            Object.entries(messageGroups).map(([date, groupMessages]) => (
                                <div key={date} className="space-y-4 pt-6">
                                    <div className="flex justify-center mb-4 mt-2">
                                        <div className="bg-transparent text-[11px] font-medium text-slate-400 dark:text-slate-500">
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
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="flex justify-start ml-[40px]"
                            >
                                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 px-3.5 py-2.5 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* ── FLOATING INPUT AREA ── */}
                    <footer className="py-3 relative border-t border-slate-200 dark:border-slate-800/60">
                        {replyTo && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="absolute bottom-[calc(100%-1rem)] left-6 right-6 mb-2 bg-slate-100 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-blue-500/20 p-3 rounded-[16px] flex items-center justify-between z-10"
                            >
                                <div className="min-w-0 border-l-4 border-blue-500 pl-3">
                                    <p className="text-[12px] font-extrabold text-blue-600 dark:text-blue-400">Replying to {replyTo.senderId === currentUserId ? 'yourself' : (replyTo.sender?.displayName || replyTo.sender?.username)}</p>
                                    <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">{replyTo.content}</p>
                                </div>
                                <button
                                    onClick={() => setReplyTo(null)}
                                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-white/50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-full left-4 mb-2 z-20 shadow-2xl rounded-[16px] overflow-hidden">
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
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute bottom-full left-6 mb-2 mt-4 z-10 group"
                                >
                                    <div className="relative inline-block rounded-[20px] shadow-xl overflow-hidden border-2 border-white dark:border-slate-800">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="h-32 object-cover"
                                        />
                                        <button
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 bg-slate-900/50 hover:bg-red-500 backdrop-blur-md text-white p-1.5 rounded-full shadow-lg transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!messageInput.trim() && !selectedFile) return;
                            onSendMessage(messageInput, selectedFile, replyTo?.id, replyTo?.content);
                            setReplyTo(null);
                            removeImage();
                            setShowEmojiPicker(false);
                        }} className="flex items-center gap-2 bg-white dark:bg-slate-800 md:rounded-full rounded-2xl p-1.5 pl-3 border border-slate-200 dark:border-slate-700 w-full shadow-sm">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-full transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                >
                                    <Smile className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Message..."
                                    className="w-full bg-transparent text-slate-900 dark:text-white px-2 py-2 border-none focus:outline-none focus:ring-0 transition-all placeholder-slate-500 text-[14px]"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!messageInput.trim() && !selectedFile}
                                className="w-[36px] h-[36px] shrink-0 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 dark:bg-slate-100 dark:hover:bg-white dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white dark:text-slate-900 rounded-full transition-all flex items-center justify-center mr-0.5"
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </button>
                        </form>
                    </footer>
                </div>

                {/* ── SOFT SIDEBAR ── */}
                <AnimatePresence>
                    {showSidebar && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-transparent border-l border-slate-200 dark:border-slate-800/60 overflow-hidden flex flex-col shrink-0"
                        >
                            <div className="p-6 flex flex-col items-center text-center">
                                <div
                                    className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 bg-cover bg-center border-[3px] border-white dark:border-[#0b1120] shadow-md mb-4 relative overflow-hidden"
                                >
                                    {recipient.avatarUrl ? (
                                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${fixUrl(recipient.avatarUrl)})` }} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-slate-400">
                                            {(recipient.displayName || recipient.username)?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-[18px] font-bold text-slate-900 dark:text-white mb-6">{recipient.displayName || recipient.username}</h3>

                                <div className="w-full space-y-4">
                                    <div className="text-left">
                                        <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-slate-400" /> Shared Media
                                        </h4>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {sharedMedia.length > 0 ? sharedMedia.map(item => (
                                                <div key={item.id} className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                                                    <img src={fixUrl(item.imageUrl)} alt="Shared" className="w-full h-full object-cover" />
                                                </div>
                                            )) : (
                                                <div className="col-span-3 py-6 flex flex-col items-center opacity-60 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                                    <ImageIcon className="w-6 h-6 mb-2 text-slate-400" />
                                                    <p className="text-[12px] font-medium text-slate-400">No media yet</p>
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
