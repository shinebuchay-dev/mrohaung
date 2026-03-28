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
    ArrowUpRight
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
        const [oRes, vRes, nRes] = await Promise.all([
            api.get('/admin/overview'),
            api.get('/admin/verification-requests', { params: { page: 1, limit: 5 } }),
            api.get('/admin/notifications', { params: { page: 1, limit: 10 } })
        ]);
        setOverview(oRes.data);
        setRecentVerifications(vRes.data.requests || []);
        setRecentNotifications(nRes.data.notifications || []);
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
            setError(e?.response?.data?.message || 'Action failed');
        } finally {
            setProcessingId(null);
        }
    };

    const deleteRow = async (id: string, customTab?: Tab) => {
        const targetTab = customTab || tab;
        if (!confirm(`Delete this ${targetTab.slice(0, -1)}?`)) return;
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
            setError(e?.response?.data?.message || 'Delete failed');
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
                setError(e?.response?.data?.message || 'Request failed');
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
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header section - Compact */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        Admin Dashboard
                    </h1>
                </div>

                <div className="flex bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
                    <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
                    <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
                    <TabButton active={tab === 'verification'} onClick={() => setTab('verification')}>
                        Verifications
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
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-500/5 border border-red-200/50 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {tab === 'overview' ? (
                <OverviewPanel 
                    loading={loading} 
                    overview={overview} 
                    recentVerifications={recentVerifications} 
                    recentNotifications={recentNotifications}
                    onVerify={handleVerification}
                    onDeleteNotification={(id) => deleteRow(id, 'notifications')}
                />
            ) : (
                <div className="space-y-4">
                    {tab === 'users' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search users..."
                                    className="w-full bg-transparent pl-9 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-medium text-sm"
                                />
                            </div>
                            <button
                                onClick={() => { setPage(1); fetchList(); }}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all font-bold text-xs shadow-lg shadow-blue-500/10"
                            >
                                Search
                            </button>
                        </div>
                    )}

                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] no-scrollbar">
                            <table className="w-full text-[12px] text-left">
                                <thead className="bg-slate-50/50 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-white/5 sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        {getColumns(tab).map((c) => (
                                            <th key={c} className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">{c}</th>
                                        ))}
                                        <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td className="py-20 text-center" colSpan={10}>
                                                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                                            </td>
                                        </tr>
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td className="py-20 text-center text-slate-400 font-bold" colSpan={10}>No data found</td>
                                        </tr>
                                    ) : (
                                        rows.map((r) => (
                                            <tr key={r.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                {renderCells(tab, r).map((cell, idx) => (
                                                    <td key={idx} className="py-3 px-5 align-middle">{cell}</td>
                                                ))}
                                                <td className="py-3 px-5 text-right whitespace-nowrap">
                                                    {tab === 'verification' ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button onClick={() => handleVerification(r.id, 'approved')} className="h-7 px-3 rounded-lg bg-emerald-500 text-white text-[10px] font-bold">Approve</button>
                                                            <button onClick={() => handleVerification(r.id, 'rejected')} className="h-7 px-3 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 text-[10px] font-bold">Reject</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => deleteRow(r.id)} className="h-7 px-3 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-red-500 text-[10px] font-bold">Delete</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination - Compact */}
                    <div className="flex justify-between items-center px-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{total} entries</div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
                            <div className="h-8 px-3 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-black">{page} <span className="mx-1 opacity-20">/</span> {totalPages}</div>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
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
        return <div className="grid grid-cols-2 md:grid-cols-6 gap-3"><div className="h-20 bg-slate-100 dark:bg-white/5 animate-pulse rounded-2xl col-span-full"></div></div>;
    }

    if (!overview) return null;

    const stats = [
        { label: 'Users', value: overview.counts.users, icon: Users, color: 'text-blue-500' },
        { label: 'Posts', value: overview.counts.posts, icon: FileText, color: 'text-indigo-500' },
        { label: 'Comments', value: overview.counts.comments, icon: MessageCircle, color: 'text-emerald-500' },
        { label: 'Stories', value: overview.counts.stories, icon: Zap, color: 'text-amber-500' },
        { label: 'Msgs', value: overview.counts.messages, icon: Mail, color: 'text-rose-500' },
        { label: 'Logs', value: overview.counts.notifications, icon: Bell, color: 'text-violet-500' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Horizontal Compact Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm hover:border-blue-500/20 transition-all flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <s.icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{s.value.toLocaleString()}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Dashboard 2-Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Recent Verifications */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[500px]">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Pending Verifications</h3>
                        </div>
                        {overview.counts.pendingVerifications > 0 && (
                            <span className="text-[10px] font-black text-red-500">{overview.counts.pendingVerifications} New</span>
                        )}
                    </div>
                    <div className="overflow-y-auto no-scrollbar p-2 space-y-2">
                        {recentVerifications.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-xs font-bold">No pending requests</div>
                        ) : (
                            recentVerifications.map((r: any) => (
                                <div key={r.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 border border-slate-200/50">
                                                {r.avatarUrl && <img src={fixUrl(r.avatarUrl)} className="w-full h-full object-cover" />}
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-black text-slate-900 dark:text-white whitespace-nowrap">@{r.username}</div>
                                                <div className="text-[9px] text-slate-400 font-bold">{new Date(r.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => onVerify(r.id, 'approved')} className="h-6 px-2.5 rounded-lg bg-emerald-500 text-white text-[9px] font-black">Approve</button>
                                            <button onClick={() => onVerify(r.id, 'rejected')} className="h-6 px-2.5 rounded-lg bg-white dark:bg-white/5 text-slate-500 text-[9px] font-black">Reject</button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 italic opacity-80">"{r.reason}"</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Notifications / Logs */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[500px]">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-blue-500" />
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">System Logs</h3>
                        </div>
                    </div>
                    <div className="overflow-y-auto no-scrollbar p-0 divide-y divide-slate-100 dark:divide-white/5">
                        {recentNotifications.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-xs font-bold">No logs found</div>
                        ) : (
                            recentNotifications.map((n: any) => (
                                <div key={n.id} className="p-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-start gap-3 group">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Clock className="w-3 h-3 text-blue-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{n.type}</span>
                                            <span className="text-[9px] text-slate-400 font-bold">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-normal mb-1">{n.message}</div>
                                        <div className="text-[9px] text-slate-400 flex items-center gap-1.5 font-bold">
                                            <span>From @{n.fromUsername}</span>
                                            <span className="opacity-30">→</span>
                                            <span>To @{n.toUsername}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => onDeleteNotification(n.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
        case 'users': return ['ID', 'Identity', 'Email', 'Joined'];
        case 'verification': return ['Account', 'Name', 'Reason', 'Status', 'Date'];
        case 'notifications': return ['ID', 'Type', 'Target', 'Origin', 'Status', 'Message', 'Date'];
        default: return [];
    }
}

function renderCells(tab: Tab, r: any) {
    const timeClass = "font-black text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tight";
    switch (tab) {
        case 'users':
            return [
                <span key="id" className="font-mono text-[10px] opacity-40">{r.id.slice(-8)}</span>,
                <div key="user" className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-[9px]">
                        {r.username[0].toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">@{r.username}</span>
                </div>,
                <span key="email" className="font-bold text-slate-500">{r.email}</span>,
                <span key="date" className={timeClass}>{new Date(r.createdAt).toLocaleDateString()}</span>
            ];
        case 'verification':
            return [
                <div className="flex items-center gap-2" key="user">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 border border-slate-200/50">
                        {r.avatarUrl && <img src={fixUrl(r.avatarUrl)} className="w-full h-full object-cover" />}
                    </div>
                    <span className="font-black text-[12px]">@{r.username}</span>
                </div>,
                <span key="name" className="font-bold">{r.displayName || '-'}</span>,
                <div key="reason" className="max-w-[150px] italic text-slate-500 text-[10px] line-clamp-1">"{r.reason}"</div>,
                <span key="status" className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>{r.status}</span>,
                <span key="date" className={timeClass}>{new Date(r.createdAt).toLocaleDateString()}</span>
            ];
        case 'notifications':
            return [
                <span key="id" className="font-mono text-[9px] opacity-30">{r.id.slice(-6)}</span>,
                <span key="type" className="font-black uppercase text-[9px] tracking-widest text-blue-500">{r.type}</span>,
                <span key="to" className="font-bold">@{r.toUsername}</span>,
                <span key="from" className="font-bold">@{r.fromUsername}</span>,
                <span key="read" className={`text-[9px] font-black uppercase ${r.read ? 'text-slate-300' : 'text-blue-500'}`}>{r.read ? 'Read' : 'New'}</span>,
                <div key="msg" className="max-w-[150px] truncate opacity-80 text-[11px]">"{r.message}"</div>,
                <span key="date" className={timeClass}>{new Date(r.createdAt).toLocaleDateString()}</span>,
            ];
        default: return [];
    }
}
