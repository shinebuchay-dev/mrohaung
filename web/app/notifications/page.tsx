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
        <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h1>
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        Mark all read
                    </button>
                )}
            </header>

            {/* List */}
            <div className="w-full pb-20">
                {notifications.length > 0 ? (
                    notifications.map((notification) => (
                        <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full flex items-start gap-4 p-4 transition-colors text-left relative border-b border-slate-200 dark:border-white/5 
                                ${!notification.read ? 'bg-blue-50/50 dark:bg-white/[0.04]' : 'bg-white dark:bg-transparent'}`}
                        >
                            <div className="relative shrink-0">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 ring-2 ring-white dark:ring-[#0f172a] shadow-sm">
                                    {notification.from.avatarUrl ? (
                                        <img
                                            src={fixUrl(notification.from.avatarUrl)}
                                            alt={notification.from.displayName || notification.from.username || ''}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
                                            <span className="text-slate-500 dark:text-slate-300 font-bold text-lg">
                                                {(notification.from.displayName || notification.from.username)?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {!notification.read && (
                                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 rounded-full border-[3px] border-white dark:border-[#0f172a]" />
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="text-[14px] text-slate-800 dark:text-slate-200 leading-snug">
                                    <span className="inline-flex items-center gap-1 font-bold dark:text-white">
                                        {notification.from.displayName || notification.from.username}
                                        {!!notification.from.isVerified && (
                                            <div className="flex-shrink-0 ml-[2px] flex items-center justify-center bg-amber-500 rounded-full w-[12px] h-[12px]">
                                                <Check className="w-[8px] h-[8px] text-white" strokeWidth={6} />
                                            </div>
                                        )}
                                    </span>
                                    <span className="ml-[5px] opacity-90 leading-tight inline-block">{notification.message}</span>
                                </div>
                                <p className={`text-[12px] font-semibold mt-1.5 ${!notification.read ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                                    {formatTimeRelative(notification.createdAt)}
                                </p>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="py-20 px-6 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Caught up!</h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">You don't have any notifications yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
