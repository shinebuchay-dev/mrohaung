'use client';

import { Message } from '@/types/messaging';
import { fixUrl } from '@/lib/utils';

interface MessageBubbleProps {
    message: Message;
    currentUserId: string;
    formatTime: (date: string) => string;
}

export default function MessageBubble({ message, currentUserId, formatTime }: MessageBubbleProps) {
    const isOwnMessage = message.senderId === currentUserId;

    return (
        <div className={`flex w-full mb-4 px-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} group hover:-translate-y-0.5 transition-transform duration-300`}>
            <div className={`flex flex-col gap-1.5 max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                
                {/* ── META: TOP TIME ── */}
                <div className={`flex items-center px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] font-bold tracking-wide ${isOwnMessage ? 'text-blue-500/60 flex-row-reverse' : 'text-slate-400'}`}>
                    {formatTime(message.createdAt)}
                    {isOwnMessage && message.read && <span className="ml-1.5 opacity-70">• Read</span>}
                </div>

                {/* ── BUBBLE FORMAT ── */}
                <div className={`flex items-end gap-2.5 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* AVATAR SQUIRCLE */}
                    <div className="flex-shrink-0 mb-0.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shadow-sm">
                            {message.sender?.avatarUrl ? (
                                <img src={fixUrl(message.sender.avatarUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    {(message.sender?.displayName || message.sender?.username)?.[0]?.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* PILL BUBBLE */}
                    <div className={`px-3.5 py-2 shadow-sm transition-shadow ${isOwnMessage 
                        ? 'bg-blue-500 text-white rounded-[18px] rounded-br-sm' 
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-[18px] rounded-bl-sm border border-slate-100 dark:border-slate-700/50'
                    }`}>
                        
                        {/* REPLY THUMB */}
                        {message.replyToContent && (
                            <div className={`mb-1.5 px-2 py-1.5 rounded-lg text-[11px] line-clamp-1 ${isOwnMessage ? 'bg-black/10 text-white/90' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                <span className="opacity-70 mr-1">Reply:</span> {message.replyToContent}
                            </div>
                        )}

                        <p className="text-[14px] leading-snug whitespace-pre-wrap break-words">
                            {message.content}
                        </p>
                    </div>
                </div>

                {/* ── REACTIONS REAR ── */}
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className={`flex items-center gap-1 ${isOwnMessage ? 'pr-11 flex-row-reverse' : 'pl-11 flex-row'}`}>
                        <div className="flex gap-1">
                            {Object.entries(message.reactions).map(([emoji, userIds]) => (
                                <span key={emoji} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-full px-2 py-0.5 text-[11px] flex items-center gap-1">
                                    {emoji} <span className="font-bold text-blue-500">{userIds.length > 1 && userIds.length}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
