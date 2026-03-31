'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function NotificationMobileIcon() {
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket } = useSocket();
    const pathname = usePathname();
    const isActive = pathname === '/notifications' || pathname?.startsWith('/notifications/');

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('/notifications');
                setUnreadCount(response.data.unreadCount);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();

        if (!socket) return;
        socket.on('notification', () => {
            setUnreadCount(prev => prev + 1);
        });

        // Whenever marked as read
        // It's a bit tricky because the real app resets count on click, but this is a rough sync.
        
        return () => {
            socket.off('notification');
        };
    }, [socket]);

    return (
        <Link
            href="/notifications"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${isActive 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-slate-500 dark:text-slate-400'}`}
        >
            <div className="relative">
                <Bell className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white dark:border-[#0f172a] animate-pulse" />
                )}
            </div>
            <span className="text-[10px] font-medium mt-0.5">Alerts</span>
        </Link>
    );
}
