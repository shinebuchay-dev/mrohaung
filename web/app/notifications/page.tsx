'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, UserPlus, Heart, MessageSquare, ShieldCheck, ChevronLeft } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { fixUrl } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
    id: string;
    type: 'friend_request' | 'like' | 'comment' | 'verification';
    message: string;
    from: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
        isVerified?: boolean;
    };
    createdAt: string;
    read: boolean;
}

const formatTimeRelative = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return commentDate.toLocaleDateString();
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();
    const router = useRouter();

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('/notifications');
                setNotifications(response.data.notifications);
                setUnreadCount(response.data.unreadCount);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();

        if (!socket) return;
        socket.on('notification', (notification: Notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            socket.off('notification');
        };
    }, [socket]);

    const handleNotificationClick = async (notification: Notification) => {
        setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await api.put(`/notifications/${notification.id}/read`);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }

        if (notification.type === 'friend_request') {
            router.push('/friends');
        } else {
            router.push(`/profile/${notification.from.username}`);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Loading notifications...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen relative">
            {/* Content Area - Seamlessly integrated into parent background */}
            <div className="w-full">
                {notifications.length > 0 ? (
                    <div className="flex flex-col gap-1 pb-32 sm:pb-24">
                        {notifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full group flex items-start gap-3 sm:gap-4 p-4 transition-all text-left relative rounded-2xl sm:rounded-3xl border border-transparent
                                    ${!notification.read 
                                        ? 'bg-blue-50/40 dark:bg-blue-500/5 backdrop-blur-[2px]' 
                                        : 'hover:bg-slate-100/50 dark:hover:bg-white/[0.02]'}
                                    hover:border-slate-200/50 dark:hover:border-white/5`}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all">
                                        {notification.from.avatarUrl ? (
                                            <img
                                                src={fixUrl(notification.from.avatarUrl)}
                                                alt={notification.from.displayName || notification.from.username || ''}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-slate-500 dark:text-slate-400 font-bold text-base">
                                                {(notification.from.displayName || notification.from.username)?.[0]?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    {!notification.read && (
                                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white dark:border-[#0f172a] shadow-sm animate-pulse" />
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0 py-0.5">
                                    <div className="text-[13px] sm:text-[14px] text-slate-800 dark:text-slate-200 leading-normal">
                                        <span className="inline-flex items-center gap-1 font-bold dark:text-white hover:underline decoration-blue-500/30">
                                            {notification.from.displayName || notification.from.username}
                                            {!!notification.from.isVerified && (
                                                <div className="flex-shrink-0 flex items-center justify-center bg-amber-500 rounded-full w-[11px] h-[11px]">
                                                    <Check className="w-[7px] h-[7px] text-white" strokeWidth={6} />
                                                </div>
                                            )}
                                        </span>
                                        <span className="ml-1.5 opacity-80 font-medium">{notification.message}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${!notification.read ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {formatTimeRelative(notification.createdAt)}
                                        </p>
                                        {!notification.read && <span className="w-1 h-1 rounded-full bg-blue-400/50" />}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-20 h-20 bg-slate-100/50 dark:bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <Bell className="w-9 h-9 text-slate-300 dark:text-slate-700" />
                            <div className="absolute top-0 right-0 w-4 h-4 bg-slate-200 dark:bg-white/10 rounded-full border-4 border-white dark:border-[#0f172a]" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 tracking-tight">Clearly Caught Up</h3>
                        <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                            This is your notification sanctuary. Everything is quiet for now.
                        </p>
                    </div>
                )}
            </div>

            {/* Floating Action Button at Bottom */}
            {unreadCount > 0 && (
                <div className="fixed bottom-20 md:bottom-10 left-12 md:left-auto md:right-10 z-[100] animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
                    <button 
                        onClick={markAllAsRead} 
                        className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] transition-all active:scale-95"
                    >
                        <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-wider">Mark All Read</span>
                    </button>
                </div>
            )}
        </div>
    );
}
