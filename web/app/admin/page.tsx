'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { fixUrl } from '@/lib/utils';
import { 
    Users, 
    FileText, 
    MessageCircle, 
    Zap, 
    Mail, 
    Bell, 
    CheckCircle2, 
    Search,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ShieldCheck,
    AlertCircle,
    LayoutDashboard,
    Loader2,
    Clock,
    UserCheck,
    ArrowUpRight,
    Info,
    MailCheck,
    Check
} from 'lucide-react';

type Tab = 'overview' | 'users' | 'notifications' | 'verification';

type Overview = {
    counts: {
        users: number;
        posts: number;
        comments: number;
        stories: number;
        messages: number;
        notifications: number;
        pendingVerifications?: number;
    };
};

export default function AdminDashboardPage() {
    const [tab, setTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [overview, setOverview] = useState<Overview | null>(null);
    const [rows, setRows] = useState<any[]>([]);
    const [recentVerifications, setRecentVerifications] = useState<any[]>([]);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [q, setQ] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

    const fetchOverviewData = async () => {
        try {
            const [oRes, vRes, nRes] = await Promise.all([
                api.get('/admin/overview'),
                api.get('/admin/verification-requests', { params: { page: 1, limit: 5 } }),
                api.get('/admin/notifications', { params: { page: 1, limit: 12 } })
            ]);
            setOverview(oRes.data);
            setRecentVerifications(vRes.data.requests || []);
            setRecentNotifications(nRes.data.notifications || []);
        } catch (e: any) {
            console.error('Overview Fetch Error:', e);
        }
    };

    const fetchList = async () => {
        const params: any = { page, limit };
        if (tab === 'users' && q.trim()) params.q = q.trim();

        const urlMap: Record<string, string> = {
            users: '/admin/users',
            notifications: '/admin/notifications',
            verification: '/admin/verification-requests',
        };

        const listKeyMap: Record<string, string> = {
            users: 'users',
            notifications: 'notifications',
            verification: 'requests',
        };

        const res = await api.get(urlMap[tab as string] || '', { params });
        setRows(res.data[listKeyMap[tab as string] || ''] || []);
        setTotal(res.data.total || 0);
    };

    const handleVerification = async (requestId: string, action: 'approved' | 'rejected') => {
        setProcessingId(requestId);
        setError('');
        try {
            await api.post('/admin/verify-action', { requestId, action });
            if (tab === 'overview') {
                await fetchOverviewData();
            } else {
                await fetchList();
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Verification action failed');
        } finally {
            setProcessingId(null);
        }
    };

    const deleteRow = async (id: string, customTab?: Tab) => {
        const targetTab = customTab || tab;
        if (!confirm(`Permanently delete this ${targetTab.slice(0, -1)}?`)) return;
        setDeletingId(id);
        setError('');

        const deleteUrlMap: Record<string, (id: string) => string> = {
            users: (x) => `/admin/users/${x}`,
            notifications: (x) => `/admin/notifications/${x}`,
        };

        try {
            await api.delete(deleteUrlMap[targetTab as string](id));
            if (tab === 'overview') {
                await fetchOverviewData();
            } else {
                await fetchList();
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Deletion failed');
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError('');
            try {
                if (tab === 'overview') {
                    await fetchOverviewData();
                } else {
                    await fetchList();
                }
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.response?.data?.message || 'Data retrieval failed');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [tab, page, limit]);

    useEffect(() => {
        setPage(1);
        setRows([]);
        setTotal(0);
        setQ('');
    }, [tab]);

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-4 lg:py-6 overflow-x-hidden">
            {/* Header section - Compact & Fixed width */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Admin Panel</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Management Hub</p>
                    </div>
                </div>

                <div className="flex bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 overflow-x-auto no-scrollbar">
                    <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Summary</TabButton>
                    <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
                    <TabButton active={tab === 'verification'} onClick={() => setTab('verification')}>
                        Requests
                        {overview?.counts?.pendingVerifications ? (
                            <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                {overview.counts.pendingVerifications}
                            </span>
                        ) : null}
                    </TabButton>
                    <TabButton active={tab === 'notifications'} onClick={() => setTab('notifications')}>Logs</TabButton>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold transition-all">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Content Section */}
            {tab === 'overview' ? (
                <OverviewPanel 
                    loading={loading} 
                    overview={overview} 
                    recentVerifications={recentVerifications} 
                    recentNotifications={recentNotifications}
                    onVerify={handleVerification}
                    onDeleteNotification={(id: string) => deleteRow(id, 'notifications')}
                />
            ) : (
                <div className="space-y-4 max-w-full overflow-hidden">
                    {tab === 'users' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-white/5 max-w-md">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Find users..."
                                    className="w-full bg-transparent pl-9 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-bold text-xs"
                                />
                            </div>
                            <button
                                onClick={() => { setPage(1); fetchList(); }}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all font-black text-[10px] uppercase"
                            >
                                GO
                            </button>
                        </div>
                    )}

                    {/* Compact Container for Tables/Lists */}
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                        {tab === 'notifications' ? (
                            /* Vertical List View for Logs to avoid horizontal scroll */
                            <div className="divide-y divide-slate-50 dark:divide-white/5 overflow-y-auto max-h-[calc(100vh-300px)] no-scrollbar bg-white dark:bg-[#0b1120]">
                                {loading ? (
                                    <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></div>
                                ) : rows.length === 0 ? (
                                    <div className="py-20 text-center font-bold text-slate-400">No logs found</div>
                                ) : (
                                    rows.map(n => (
                                        <div key={n.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <Bell className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center justify-between gap-4 mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{n.type}</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(n.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <button onClick={() => deleteRow(n.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="text-[13px] text-slate-800 dark:text-slate-200 font-semibold mb-2 leading-relaxed">{n.message}</div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200/50 dark:border-white/5">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">FROM</span>
                                                        <span className="text-[11px] font-bold">@{n.fromUsername}</span>
                                                    </div>
                                                    <ArrowUpRight className="w-3 h-3 text-slate-300" />
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200/50 dark:border-white/5">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">TO</span>
                                                        <span className="text-[11px] font-bold">@{n.toUsername}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* Regular Table View for Users/Verifications */
                            <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-300px)]">
                                <table className="w-full text-[12px] text-left">
                                    <thead className="bg-slate-50/50 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-white/5 sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            {getColumns(tab).map((c) => (
                                                <th key={c} className="py-3 px-5 font-black uppercase tracking-wider text-[10px]">{c}</th>
                                            ))}
                                            <th className="py-3 px-5 font-black uppercase tracking-wider text-[10px] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {loading ? (
                                            <tr><td className="py-20 text-center" colSpan={10}><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" /></td></tr>
                                        ) : rows.length === 0 ? (
                                            <tr><td className="py-20 text-center text-slate-400 font-bold" colSpan={10}>No entries found</td></tr>
                                        ) : (
                                            rows.map((r) => (
                                                <tr key={r.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                    {renderCells(tab, r).map((cell, idx) => (
                                                        <td key={idx} className="py-3 px-5 align-middle">{cell}</td>
                                                    ))}
                                                    <td className="py-3 px-5 text-right whitespace-nowrap">
                                                        {tab === 'verification' ? (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button onClick={() => handleVerification(r.id, 'approved')} className="h-7 px-3 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase shadow-sm">Approve</button>
                                                                <button onClick={() => handleVerification(r.id, 'rejected')} className="h-7 px-3 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 text-[10px] font-black uppercase">Dismiss</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => deleteRow(r.id)} className="h-7 px-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase">Remove</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination - Compact */}
                    <div className="flex justify-between items-center px-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{total.toLocaleString()} total objects</div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-20 transition-all hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
                            <div className="h-8 px-3 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-black">{page} <span className="mx-1 opacity-20">/</span> {totalPages}</div>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-20 transition-all hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
                            
                            <select
                                value={limit}
                                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                                className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-black outline-none appearance-none pr-6 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_4px_center] bg-no-repeat"
                            >
                                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-5 py-2 rounded-lg text-[12px] font-black tracking-wide transition-all ${active
                ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
        >
            {children}
        </button>
    );
}

function OverviewPanel({ loading, overview, recentVerifications, recentNotifications, onVerify, onDeleteNotification }: any) {
    if (loading && !overview) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><div className="h-20 bg-slate-100 dark:bg-white/5 animate-pulse rounded-2xl col-span-full"></div></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="h-64 bg-slate-100 dark:bg-white/5 animate-pulse rounded-2xl"></div>
                    <div className="h-64 bg-slate-100 dark:bg-white/5 animate-pulse rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (!overview) return null;

    const stats = [
        { label: 'Users', value: overview.counts.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Posts', value: overview.counts.posts, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { label: 'Comm', value: overview.counts.comments, icon: MessageCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Stories', value: overview.counts.stories, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Inbox', value: overview.counts.messages, icon: Mail, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { label: 'Events', value: overview.counts.notifications, icon: Bell, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Horizontal Compact Stats - High Density */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl p-3 flex items-center justify-between hover:border-blue-500/30 transition-all group shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center ${s.color} shrink-0`}>
                                <s.icon className="w-4 h-4" />
                            </div>
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{s.label}</div>
                        </div>
                        <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{s.value.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            {/* Live Dashboard Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* 1. Pending Verifications */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.15em]">Live Verifications</h3>
                        </div>
                        {overview.counts.pendingVerifications > 0 && (
                            <span className="text-[9px] font-black px-2 py-0.5 bg-red-500 text-white rounded-full uppercase">{overview.counts.pendingVerifications} Pending</span>
                        )}
                    </div>
                    <div className="overflow-y-auto no-scrollbar p-3 space-y-3">
                        {recentVerifications.length === 0 ? (
                            <div className="py-20 text-center"><Info className="w-8 h-8 text-slate-100 mx-auto mb-2" /><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No Active requests</p></div>
                        ) : (
                            recentVerifications.map((r: any) => (
                                <div key={r.id} className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-slate-200/50 shrink-0">
                                                {r.avatarUrl ? <img src={fixUrl(r.avatarUrl)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-[10px]">{r.username[0]}</div>}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[12px] font-black text-slate-900 dark:text-white truncate">@{r.username}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">{new Date(r.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => onVerify(r.id, 'approved')} className="h-7 px-3 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase shadow-sm">Allow</button>
                                            <button onClick={() => onVerify(r.id, 'rejected')} className="h-7 px-3 rounded-lg bg-white dark:bg-white/10 text-slate-400 text-[9px] font-black uppercase">Deny</button>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal italic line-clamp-2 px-1">"{r.reason}"</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. System Logs / Notifications */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.15em]">Recent Activity</h3>
                        </div>
                        <Bell className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                    <div className="overflow-y-auto no-scrollbar p-0 divide-y divide-slate-100/50 dark:divide-white/5">
                        {recentNotifications.length === 0 ? (
                            <div className="py-20 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">Logs clear</div>
                        ) : (
                            recentNotifications.map((n: any) => (
                                <div key={n.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-start gap-3 group transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/5 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/10">
                                        <Clock className="w-3.5 h-3.5 text-blue-500/70" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{n.type}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-slate-400 font-bold">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <button onClick={() => onDeleteNotification(n.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-[12px] text-slate-700 dark:text-slate-300 font-bold leading-tight mb-1.5">{n.message}</div>
                                        <div className="flex items-center gap-2 text-[9px] font-bold">
                                            <span className="text-slate-400">@{n.fromUsername}</span>
                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                            <span className="text-slate-500/70">To @{n.toUsername}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getColumns(tab: Tab) {
    switch (tab) {
        case 'users': return ['UUID-ID', 'User Handle', 'Email Contact', 'Join Date'];
        case 'verification': return ['Account', 'Legal Name', 'Reasoning', 'Status', 'Modified At'];
        default: return [];
    }
}

function renderCells(tab: Tab, r: any) {
    const timeClass = "font-black text-[9px] text-slate-400 uppercase tracking-tighter";
    switch (tab) {
        case 'users':
            return [
                <span key="id" className="font-mono text-[10px] opacity-30 tracking-tight">{r.id}</span>,
                <div key="user" className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-[9px]">
                        {r.username[0].toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">@{r.username}</span>
                </div>,
                <span key="email" className="font-bold text-slate-600 dark:text-slate-400">{r.email}</span>,
                <span key="date" className={timeClass}>{new Date(r.createdAt).toLocaleDateString()}</span>
            ];
        case 'verification':
            return [
                <div className="flex items-center gap-2" key="user">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 border border-slate-200/50 shrink-0">
                        {r.avatarUrl ? <img src={fixUrl(r.avatarUrl)} className="w-full h-full object-cover" /> : null}
                    </div>
                    <span className="font-black text-[12px]">@{r.username}</span>
                </div>,
                <span key="name" className="font-black text-slate-900 dark:text-white">{r.displayName || '-'}</span>,
                <div key="reason" className="max-w-[120px] font-medium text-slate-500 text-[10px] line-clamp-1 italic">"{r.reason}"</div>,
                <span key="status" className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{r.status}</span>,
                <span key="date" className={timeClass}>{new Date(r.createdAt).toLocaleDateString()}</span>
            ];
        default: return [];
    }
}
