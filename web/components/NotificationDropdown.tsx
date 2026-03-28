'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, UserPlus, Heart, MessageSquare, ShieldCheck, X } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { fixUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
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
        setShowDropdown(false);
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

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'friend_request': return 'text-blue-500 bg-blue-500/10';
            case 'like': return 'text-red-500 bg-red-500/10';
            case 'comment': return 'text-green-500 bg-green-500/10';
            default: return 'text-slate-500 bg-slate-500/10';
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all relative ${showDropdown ? 'bg-blue-600/10 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'}`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-[8px] right-[8px] w-2 h-2 bg-blue-600 rounded-full border-2 border-white dark:border-[#0b1120] animate-pulse" />
                )}
            </button>

            <AnimatePresence>
                {showDropdown && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-white/5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden z-[100]"
                        >
                            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                <h3 className="font-bold text-[15px] text-slate-900 dark:text-white">Notifications</h3>
                                <div className="flex items-center gap-3">
                                    <button onClick={markAllAsRead} className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider hover:opacity-80">
                                        Mark All Read
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                {notifications.length > 0 ? (
                                    notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className="w-full flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors text-left relative group border-b border-slate-50 dark:border-white/[0.02] last:border-0"
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                                                    {notification.from.avatarUrl ? (
                                                        <img
                                                            src={fixUrl(notification.from.avatarUrl)}
                                                            alt={notification.from.displayName || notification.from.username || ''}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
                                                            <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                                                                {(notification.from.displayName || notification.from.username)?.[0]?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {!notification.read && (
                                                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white dark:border-[#0b1120]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">
                                                    <span className="inline-flex items-center gap-1 font-bold dark:text-white">
                                                        {notification.from.displayName || notification.from.username}
                                                        {notification.from.isVerified && (
                                                            <div className="flex-shrink-0 ml-[2.5px] flex items-center justify-center bg-amber-500 rounded-full w-[11.5px] h-[11.5px] mt-[1px]">
                                                                <Check className="w-[6px] h-[6px] text-white" strokeWidth={6} />
                                                            </div>
                                                        )}
                                                    </span>
                                                    <span className="ml-1 opacity-90">{notification.message}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-500 font-medium mt-1">
                                                    {formatTimeRelative(notification.createdAt)}
                                                </p>
                                            </div>
                                            <div className="shrink-0 pt-1">
                                                <div className={`w-2 h-2 rounded-full ${notification.read ? 'bg-transparent' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'}`} />
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-12 px-6 text-center">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Bell className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        <div
                            className="fixed inset-0 z-40 bg-transparent"
                            onClick={() => setShowDropdown(false)}
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
