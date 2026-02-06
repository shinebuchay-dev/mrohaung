'use client';

import { useEffect, useState } from 'react';
import { Bell, X, UserPlus, Heart, MessageCircle } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Notification {
    id: string;
    type: 'friend_request' | 'like' | 'comment';
    message: string;
    from: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    createdAt: string;
    read: boolean;
}

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket, isConnected } = useSocket();
    const router = useRouter();

    useEffect(() => {
        // Fetch notifications from API
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await api.get('/notifications');
                setNotifications(response.data.notifications);
                setUnreadCount(response.data.unreadCount);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();

        if (!socket) return;

        // Listen for new notifications
        socket.on('notification', (notification: Notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            socket.off('notification');
        };
    }, [socket]);

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read in UI
        setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        // Mark as read in backend
        try {
            await api.put(`/notifications/${notification.id}/read`);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }

        // Navigate based on type
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

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'friend_request':
                return <UserPlus className="w-5 h-5 text-blue-500" />;
            case 'like':
                return <Heart className="w-5 h-5 text-red-500" />;
            case 'comment':
                return <MessageCircle className="w-5 h-5 text-green-500" />;
            default:
                return <Bell className="w-5 h-5 text-[#64748b]" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2.5 rounded-full hover:bg-[#1e293b] transition-colors relative"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div className="absolute right-0 mt-2 w-80 bg-[#1e293b] border border-[#334155] rounded-2xl shadow-xl overflow-hidden z-50">
                        <div className="p-4 border-b border-[#334155] flex items-center justify-between">
                            <h3 className="font-bold text-white">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-blue-500 hover:text-blue-400 font-medium"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDropdown(false)}
                                    className="p-1 hover:bg-[#334155] rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4 text-[#64748b]" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full flex items-start gap-3 p-4 hover:bg-[#334155] transition-colors text-left ${!notification.read ? 'bg-blue-500/5' : ''
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-[#334155] overflow-hidden flex-shrink-0">
                                            {notification.from.avatarUrl ? (
                                                <img
                                                    src={notification.from.avatarUrl}
                                                    alt={notification.from.displayName || notification.from.username || ''}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                                    <span className="text-white font-bold">
                                                        {(notification.from.displayName || notification.from.username)?.[0]?.toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white">
                                                <span className="font-semibold">{notification.from.displayName || notification.from.username}</span>{' '}
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-[#64748b] mt-1">
                                                {new Date(notification.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-[#64748b]">
                                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No notifications yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />
                </>
            )}
        </div>
    );
}
