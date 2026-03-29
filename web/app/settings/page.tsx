'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Lock, Bell, Shield, LogOut, Trash2, ShieldCheck, Check, Loader2, X, Mail, Copy, CheckCheck, Clock, XCircle, AtSign } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useTheme } from '@/lib/ThemeContext';
import api from '@/lib/api';

export default function SettingsPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState<any>(null);
    const [requesting, setRequesting] = useState(false);
    const [reason, setReason] = useState('');
    const [showVerifyForm, setShowVerifyForm] = useState(false);

    // Email Application State
    const [emailApp, setEmailApp] = useState<any>(null);
    const [emailPrefix, setEmailPrefix] = useState('');
    const [emailApplying, setEmailApplying] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        if (user?.username) setEmailPrefix(user.username || '');
        fetchPrivacySettings();
        fetchVerificationStatus();
        fetchEmailApplication();
    }, []);

    const [isVerifying, setIsVerifying] = useState(true);

    const fetchVerificationStatus = async () => {
        setIsVerifying(true);
        try {
            const res = await api.get('/profile/verify-status');
            setVerificationStatus(res.data);
        } catch (error) {
            console.error('Failed to fetch verification status:', error);
        } finally {
            setIsVerifying(false);
        }
    };

    const fetchEmailApplication = async () => {
        try {
            const res = await api.get('/email-applications/me');
            setEmailApp(res.data.application);
        } catch {
            // not applied yet
        }
    };

    const handleApplyEmail = async () => {
        setEmailError('');
        if (!emailPrefix || !/^[a-z0-9._-]{3,32}$/.test(emailPrefix)) {
            setEmailError('3-32 character, a-z 0-9 . - _ သာ သုံးနိုင်သည်');
            return;
        }
        setEmailApplying(true);
        try {
            const res = await api.post('/email-applications', { emailPrefix });
            setEmailApp(res.data.application);
            setShowEmailForm(false);
        } catch (err: any) {
            setEmailError(err.response?.data?.message || 'Failed to apply');
        } finally {
            setEmailApplying(false);
        }
    };

    const handleCancelEmailApp = async () => {
        if (!confirm('Cancel your email application?')) return;
        try {
            await api.delete('/email-applications/me');
            setEmailApp(null);
            setShowEmailForm(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to cancel');
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleRequestVerification = async () => {
        if (!reason.trim() || reason.trim().length < 10) {
            return alert('Please provide a reason (minimum 10 characters)');
        }
        setRequesting(true);
        try {
            await api.post('/profile/verify-request', { reason });
            fetchVerificationStatus();
            setReason('');
            setShowVerifyForm(false);
            alert('Verification request submitted!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setRequesting(false);
        }
    };

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
            <div className="max-w-3xl mx-auto pb-20">
                <div className="mb-8 mt-4 hidden md:block">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences</p>
                </div>

                <div className="space-y-6">
                    {/* Account */}
                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-white/5">
                            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Account
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            <button
                                onClick={() => router.push(currentUser?.username ? `/profile/${currentUser.username}` : '/login')}
                                className="w-full px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left flex items-center justify-between group"
                            >
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Profile</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">View and edit your profile</p>
                                </div>
                                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 rotate-180 transition-colors" />
                            </button>
                            <button
                                className="w-full px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left flex items-center justify-between group"
                                onClick={() => alert('Change password coming soon!')}
                            >
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Change Password</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Update your password</p>
                                </div>
                                <Lock className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                            </button>
                        </div>
                    </div>

                    {/* ── MROHAUNG Email Application ── */}


                    {/* Notifications */}
                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-white/5">
                            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Notifications
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            <div className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">Push Notifications</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Receive notifications on your device</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Privacy & Security */}
                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-white/5">
                            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Privacy & Security
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            <div className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">Dark Mode</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Toggle application theme</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={theme === 'dark'} onChange={() => toggleTheme()} />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">Private Account</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {isPrivate ? 'Only friends can see your posts' : 'Anyone can see your posts'}
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isPrivate} onChange={(e) => handlePrivacyToggle(e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="px-5 py-5">
                                <p className="font-bold text-slate-900 dark:text-white mb-1">Blocked Users</p>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                                    {blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''} blocked
                                </p>
                                {blockedUsers.length > 0 && (
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {blockedUsers.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    {user.avatarUrl ? (
                                                        <img src={user.avatarUrl} alt={user.displayName || user.username || ''} className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-white flex items-center justify-center font-bold">
                                                            {(user.displayName || user.username)?.[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-slate-900 dark:text-white font-bold">{user.displayName || user.username}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleUnblock(user.id)}
                                                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-xl transition-colors"
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

                    {/* Verification */}
                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-white/5">
                            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Verification
                            </h2>
                        </div>
                        <div className="p-5">
                            {isVerifying ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your status...</p>
                                </div>
                            ) : verificationStatus?.request?.status === 'pending' ? (
                                <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        </div>
                                        <p className="font-bold text-blue-700 dark:text-blue-400">Verification Under Review</p>
                                    </div>
                                    <p className="text-sm text-blue-600 dark:text-blue-500 font-medium leading-relaxed">
                                        Your request is currently being reviewed by our team.
                                    </p>
                                </div>
                            ) : verificationStatus?.isVerified ? (
                                <div className="bg-amber-50 dark:bg-amber-500/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
                                        <Check className="w-7 h-7 font-black" />
                                    </div>
                                    <div>
                                        <p className="font-black text-amber-700 dark:text-amber-400 text-lg">Account Verified</p>
                                        <p className="text-sm text-amber-600 dark:text-amber-500 mt-0.5 font-medium">Your account has the Royal Gold badge.</p>
                                    </div>
                                </div>
                            ) : verificationStatus?.request?.status === 'rejected' ? (
                                <div className="space-y-4">
                                    <div className="bg-red-50 dark:bg-red-500/10 p-5 rounded-2xl border border-red-100 dark:border-red-500/20">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shrink-0">
                                                <X className="w-4 h-4" />
                                            </div>
                                            <p className="font-bold text-red-700 dark:text-red-400">Request Denied</p>
                                        </div>
                                        <p className="text-sm text-red-600 dark:text-red-500 font-medium">Your verification request has been declined.</p>
                                    </div>
                                    <button onClick={() => setShowVerifyForm(true)} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95">
                                        Apply Again
                                    </button>
                                </div>
                            ) : showVerifyForm ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Why should you be verified?</label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Provide a detailed reason..."
                                            className="w-full h-32 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleRequestVerification} disabled={requesting || reason.trim().length < 10} className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all">
                                            {requesting ? 'Submitting...' : 'Submit Application'}
                                        </button>
                                        <button onClick={() => setShowVerifyForm(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white mb-1">Apply for Royal Gold Badge</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                                        Verified accounts have a Royal Gold badge next to their names.
                                    </p>
                                    <button onClick={() => setShowVerifyForm(true)} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95">
                                        Get Started
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white dark:bg-[#1e293b] border border-red-200 dark:border-red-500/20 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-red-100 dark:border-red-500/10">
                            <h2 className="font-bold text-red-500 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" /> Danger Zone
                            </h2>
                        </div>
                        <div className="divide-y divide-red-100 dark:divide-red-500/10">
                            <button onClick={handleLogout} className="w-full px-5 py-4 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors text-left flex items-center justify-between group">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">Logout</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sign out of your account</p>
                                </div>
                                <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors" />
                            </button>
                            <button className="w-full px-5 py-4 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors text-left group" onClick={handleDeleteAccount}>
                                <p className="font-bold text-red-500 dark:text-red-400">Delete Account</p>
                                <p className="text-sm font-medium text-red-400 dark:text-red-400/70">Permanently delete your account and data</p>
                            </button>
                        </div>
                    </div>

                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
                        <p>MROHAUNG Social Media v3.0.0</p>
                        <p className="mt-1">Made with ❤️ by Shine Bu Chay</p>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
