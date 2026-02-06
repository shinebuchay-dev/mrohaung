'use client';

import { Message } from '@/types/messaging';

interface MessageBubbleProps {
    message: Message;
    currentUserId: string;
    formatTime: (date: string) => string;
}

export default function MessageBubble({ message, currentUserId, formatTime }: MessageBubbleProps) {
    const isOwnMessage = message.senderId === currentUserId;

    return (
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} mb-1.5 px-2 relative w-full`}>
            {/* 100% Static Timestamp - Always visible, Very subtle, No Hover animations */}
            <div className={`h-3 flex items-end ${isOwnMessage ? 'justify-end pr-8' : 'justify-start pl-8'} w-full mb-0.5`}>
                <span className="text-[7.5px] font-bold uppercase tracking-tight text-white/20 select-none">
                    {formatTime(message.createdAt)}
                </span>
            </div>

            <div className={`flex items-end gap-1.5 ${isOwnMessage ? 'flex-row' : 'flex-row'} max-w-full`}>
                {/* Profile Icon for others */}
                {!isOwnMessage && (
                    <div className="relative flex-shrink-0 mb-0.5">
                        <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 ring-2 ring-white/5 shadow-md bg-[#1e293b]">
                            {message.sender?.avatarUrl ? (
                                <img src={message.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
                                    {(message.sender?.displayName || message.sender?.username)?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Premium Bubble - Static Design */}
                <div
                    className={`relative px-3.5 py-1.5 shadow-lg border ${isOwnMessage
                        ? 'bg-[#007aff] text-white border-blue-400/20 rounded-[18px] rounded-tr-[4px]'
                        : 'bg-[#2a354a] text-[#e4e6eb] border-white/5 rounded-[18px] rounded-tl-[4px]'
                        } max-w-[200px] sm:max-w-[240px]`}
                >
                    {/* Reply Preview */}
                    {message.replyToContent && (
                        <div className="px-2 py-0.5 mb-1 bg-black/10 text-[9px] italic opacity-40 rounded border-l-2 border-white/20 truncate">
                            {message.replyToContent}
                        </div>
                    )}

                    <p className="text-[13px] leading-[1.4] break-words whitespace-pre-wrap font-medium tracking-tight">
                        {message.content}
                    </p>
                </div>

                {/* Own Avatar & Seen Badge - Static */}
                {isOwnMessage && (
                    <div className="relative flex-shrink-0 mb-0.5 flex flex-col items-center gap-0.5">
                        <div className="h-1.5 flex items-center opacity-30">
                            <span className="text-[7.5px] font-black tracking-tighter text-blue-400">
                                {message.read ? '✓✓' : '✓'}
                            </span>
                        </div>
                        <div className="w-7 h-7 rounded-full overflow-hidden border border-blue-500/30 ring-2 ring-blue-500/10 shadow-md bg-blue-600/10">
                            {message.sender?.avatarUrl ? (
                                <img src={message.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-blue-400">
                                    {(message.sender?.displayName || message.sender?.username)?.[0]?.toUpperCase() || 'Y'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Reactions Display - Static */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
                <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'mr-8' : 'ml-8'}`}>
                    {Object.entries(message.reactions).map(([emoji, userIds]) => (
                        <div key={emoji} className="bg-white/5 border border-white/10 rounded-full px-1.5 py-0.5 text-[8px] flex items-center gap-1">
                            <span>{emoji}</span>
                            <span className="font-bold text-blue-400">{userIds.length}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
