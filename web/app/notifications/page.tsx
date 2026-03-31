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
        <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] pb-[env(safe-area-inset-bottom)] flex flex-col">
            {/* Header - Seamless Integration */}
            <header className="sticky top-0 z-50 bg-slate-50/80 dark:bg-[#0f172a]/80 backdrop-blur-md px-4 h-14 flex items-center justify-end border-b border-transparent transition-all group-scroll-header">
                {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs font-bold text-blue-600 dark:text-blue-400 py-1.5 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                        Mark all read
                    </button>
                )}
            </header>

            {/* List - Full-width Integrated Background */}
            <div className="flex-1 w-full">
                {notifications.length > 0 ? (
                    <div className="flex flex-col">
                        {notifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full flex items-start gap-4 p-4 transition-all text-left relative border-b border-slate-200/60 dark:border-white/5 
                                    ${!notification.read ? 'bg-white/40 dark:bg-white/[0.02]' : 'bg-transparent'}
                                    hover:bg-white/80 dark:hover:bg-white/[0.04]`}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 dark:bg-white/5 flex items-center justify-center">
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
                                        <div className="absolute top-0 right-0 w-3 h-3 bg-blue-600 rounded-full border-2 border-slate-50 dark:border-[#0f172a]" />
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="text-[13.5px] text-slate-800 dark:text-slate-200 leading-snug">
                                        <span className="inline-flex items-center gap-1 font-bold dark:text-white">
                                            {notification.from.displayName || notification.from.username}
                                            {!!notification.from.isVerified && (
                                                <div className="flex-shrink-0 flex items-center justify-center bg-amber-500 rounded-full w-[11px] h-[11px]">
                                                    <Check className="w-[7px] h-[7px] text-white" strokeWidth={6} />
                                                </div>
                                            )}
                                        </span>
                                        <span className="ml-[4px] opacity-90 leading-tight inline-block">{notification.message}</span>
                                    </div>
                                    <p className={`text-[11px] font-bold mt-1 ${!notification.read ? 'text-blue-600 dark:text-blue-400/80' : 'text-slate-400'}`}>
                                        {formatTimeRelative(notification.createdAt)}
                                    </p>
                                </div>
                            </button>
                        ))}
                        {/* Buffer for bottom nav */}
                        <div className="h-20 w-full" />
                    </div>
                ) : (
                    <div className="h-[calc(100dvh-56px-env(safe-area-inset-bottom))] flex flex-col items-center justify-center px-6 text-center -mt-14">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Caught up!</h3>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">You don't have any notifications yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
