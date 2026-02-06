'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Lock, Bell, Shield, LogOut, Trash2 } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

export default function SettingsPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        fetchPrivacySettings();
    }, []);

    const fetchPrivacySettings = async () => {
        try {
            const [privacyRes, blockedRes] = await Promise.all([
                api.get('/privacy/account'),
                api.get('/privacy/blocked')
            ]);
            setIsPrivate(privacyRes.data.isPrivate);
            setBlockedUsers(blockedRes.data);
        } catch (error) {
            console.error('Failed to fetch privacy settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrivacyToggle = async (checked: boolean) => {
        try {
            await api.put('/privacy/account', { isPrivate: checked });
            setIsPrivate(checked);
        } catch (error) {
            console.error('Failed to update privacy:', error);
        }
    };

    const handleUnblock = async (userId: string) => {
        try {
            await api.delete(`/privacy/unblock/${userId}`);
            setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Failed to unblock user:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;

        try {
            await api.delete('/profile');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/login');
        } catch (error) {
            console.error('Failed to delete account:', error);
            alert('Failed to delete account');
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#0f172a] text-white">
                {/* Header */}
                <div className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-[#1e293b]">
                    <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 hover:bg-[#1e293b] rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg">Settings</h1>
                            <p className="text-xs text-[#64748b]">Manage your account</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 py-6">
                    <div className="space-y-6">
                        {/* Account Section */}
                        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-[#334155]">
                                <h2 className="font-bold text-white flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-500" />
                                    Account
                                </h2>
                            </div>
                            <div className="divide-y divide-[#334155]">
                                <button
                                    onClick={() => router.push(currentUser?.username ? `/profile/${currentUser.username}` : '/login')}
                                    className="w-full px-4 py-4 hover:bg-[#334155]/50 transition-colors text-left flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-white">Profile</p>
                                        <p className="text-sm text-[#64748b]">View and edit your profile</p>
                                    </div>
                                    <ArrowLeft className="w-5 h-5 text-[#64748b] rotate-180" />
                                </button>
                                <button
                                    className="w-full px-4 py-4 hover:bg-[#334155]/50 transition-colors text-left flex items-center justify-between"
                                    onClick={() => alert('Change password coming soon!')}
                                >
                                    <div>
                                        <p className="font-semibold text-white">Change Password</p>
                                        <p className="text-sm text-[#64748b]">Update your password</p>
                                    </div>
                                    <Lock className="w-5 h-5 text-[#64748b]" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications Section */}
                        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-[#334155]">
                                <h2 className="font-bold text-white flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-blue-500" />
                                    Notifications
                                </h2>
                            </div>
                            <div className="divide-y divide-[#334155]">
                                <div className="px-4 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-white">Push Notifications</p>
                                        <p className="text-sm text-[#64748b]">Receive notifications on your device</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                <div className="px-4 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-white">Email Notifications</p>
                                        <p className="text-sm text-[#64748b]">Receive updates via email</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div className="w-11 h-6 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Privacy & Security */}
                        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-[#334155]">
                                <h2 className="font-bold text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-500" />
                                    Privacy & Security
                                </h2>
                            </div>
                            <div className="divide-y divide-[#334155]">
                                <div className="px-4 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-white">Private Account</p>
                                        <p className="text-sm text-[#64748b]">
                                            {isPrivate ? 'Only friends can see your posts' : 'Anyone can see your posts'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isPrivate}
                                            onChange={(e) => handlePrivacyToggle(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                <div className="px-4 py-4">
                                    <p className="font-semibold text-white mb-2">Blocked Users</p>
                                    <p className="text-sm text-[#64748b] mb-4">
                                        {blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''} blocked
                                    </p>
                                    {blockedUsers.length > 0 && (
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {blockedUsers.map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {user.avatarUrl ? (
                                                            <img
                                                                src={user.avatarUrl}
                                                                alt={user.displayName || user.username || ''}
                                                                className="w-8 h-8 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600" />
                                                        )}
                                                        <span className="text-white text-sm">{user.displayName || user.username}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnblock(user.id)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
                                                    >
                                                        Unblock
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-red-500/20">
                                <h2 className="font-bold text-red-500 flex items-center gap-2">
                                    <Trash2 className="w-5 h-5" />
                                    Danger Zone
                                </h2>
                            </div>
                            <div className="divide-y divide-red-500/20">
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-4 hover:bg-red-500/10 transition-colors text-left flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-white">Logout</p>
                                        <p className="text-sm text-[#64748b]">Sign out of your account</p>
                                    </div>
                                    <LogOut className="w-5 h-5 text-red-500" />
                                </button>
                                <button
                                    className="w-full px-4 py-4 hover:bg-red-500/10 transition-colors text-left"
                                    onClick={handleDeleteAccount}
                                >
                                    <p className="font-semibold text-red-500">Delete Account</p>
                                    <p className="text-sm text-[#64748b]">Permanently delete your account and data</p>
                                </button>
                            </div>
                        </div>

                        {/* App Info */}
                        <div className="text-center py-8 text-[#64748b] text-sm">
                            <p>SHINE Social Media v1.0.0</p>
                            <p className="mt-2">Made with ❤️ by Your Team</p>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
