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
    Loader2
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
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [q, setQ] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

    const fetchOverview = async () => {
        const res = await api.get('/admin/overview');
        setOverview(res.data);
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
            await fetchList();
            await fetchOverview(); // Refresh counts
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Action failed');
        } finally {
            setProcessingId(null);
        }
    };

    const deleteRow = async (id: string) => {
        if (!confirm(`Delete this ${tab.slice(0, -1)}?`)) return;
        setDeletingId(id);
        setError('');

        const deleteUrlMap: Record<string, (id: string) => string> = {
            users: (x) => `/admin/users/${x}`,
            notifications: (x) => `/admin/notifications/${x}`,
        };

        try {
            await api.delete(deleteUrlMap[tab as string](id));
            await fetchList();
            await fetchOverview();
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
                    await fetchOverview();
                } else {
                    await fetchList();
                }
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.response?.data?.message || 'Request failed');
                setRows([]);
                setTotal(0);
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
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Platform Admin</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Total control over users, content, and system status</p>
                </div>

                <div className="flex bg-slate-100/80 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/5 backdrop-blur-sm">
                    <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
                    <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
                    <TabButton active={tab === 'verification'} onClick={() => setTab('verification')}>
                        <div className="flex items-center gap-2">
                            Verifications
                            {overview?.counts?.pendingVerifications ? (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                                    {overview.counts.pendingVerifications}
                                </span>
                            ) : null}
                        </div>
                    </TabButton>
                    <TabButton active={tab === 'notifications'} onClick={() => setTab('notifications')}>Notifications</TabButton>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-[13px] font-bold">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Content Section */}
            {tab === 'overview' ? (
                <OverviewPanel loading={loading} overview={overview} />
            ) : (
                <div className="space-y-6">
                    {/* Search Bar for Users */}
                    {tab === 'users' && (
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search by username, email, or ID..."
                                    className="w-full bg-transparent pl-11 pr-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-medium text-sm"
                                />
                            </div>
                            <button
                                onClick={() => { setPage(1); fetchList(); }}
                                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
                            >
                                Search
                            </button>
                        </div>
                    )}

                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm shadow-slate-200/20 dark:shadow-none">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px] text-left">
                                <thead className="bg-slate-50/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/5">
                                    <tr>
                                        {getColumns(tab).map((c) => (
                                            <th key={c} className="py-4 px-6 font-bold uppercase tracking-wider text-[11px]">{c}</th>
                                        ))}
                                        <th className="py-4 px-6 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td className="py-20 px-6 text-center text-slate-400" colSpan={getColumns(tab).length + 1}>
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                                    <span className="font-semibold text-sm">Loading records...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td className="py-20 px-6 text-center text-slate-400 font-bold" colSpan={getColumns(tab).length + 1}>
                                                No records found
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((r) => (
                                            <tr key={r.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                {renderCells(tab, r).map((cell, idx) => (
                                                    <td key={idx} className="py-4 px-6 align-middle break-words max-w-[300px]">{cell}</td>
                                                ))}
                                                <td className="py-4 px-6 text-right whitespace-nowrap">
                                                    {tab === 'verification' ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleVerification(r.id, 'approved')}
                                                                disabled={processingId === r.id || r.status !== 'pending'}
                                                                className="h-8 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-30 transition-all font-bold text-[11px] shadow-lg shadow-emerald-500/20"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleVerification(r.id, 'rejected')}
                                                                disabled={processingId === r.id || r.status !== 'pending'}
                                                                className="h-8 px-4 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-red-500 hover:text-white transition-all font-bold text-[11px]"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => deleteRow(r.id)}
                                                            disabled={deletingId === r.id}
                                                            className="h-8 px-4 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold text-[11px]"
                                                        >
                                                            {deletingId === r.id ? 'Wait' : 'Delete'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-2">
                        <div className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {total.toLocaleString()} total entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-600 disabled:opacity-20 hover:bg-slate-50"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="h-10 px-4 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-[13px] font-black">
                                {page} <span className="mx-2 opacity-20">/</span> {totalPages}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-600 disabled:opacity-20 hover:bg-slate-50"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            <select
                                value={limit}
                                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                                className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-[12px] font-black outline-none"
                            >
                                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
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
            className={`px-6 py-2.5 rounded-xl text-[13px] font-black tracking-wide transition-all ${active
                ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm dark:shadow-blue-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
        >
            {children}
        </button>
    );
}

function OverviewPanel({ loading, overview }: { loading: boolean; overview: Overview | null }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-32 bg-slate-100 dark:bg-white/5 animate-pulse rounded-3xl" />
                ))}
            </div>
        );
    }

    if (!overview) return null;

    const stats = [
        { label: 'Users', value: overview.counts.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Posts', value: overview.counts.posts, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { label: 'Comments', value: overview.counts.comments, icon: MessageCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Stories', value: overview.counts.stories, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Messages', value: overview.counts.messages, icon: Mail, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { label: 'Notifications', value: overview.counts.notifications, icon: Bell, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {stats.map((s) => (
                <div key={s.label} className="group p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center ${s.color} transition-transform group-hover:scale-110 duration-500`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-6">
                        <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{s.label}</div>
                        <div className="text-4xl font-black text-slate-800 dark:text-white mt-1.5 tracking-tighter">
                            {s.value.toLocaleString()}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function getColumns(tab: Tab) {
    switch (tab) {
        case 'users': return ['Internal ID', 'User Identity', 'Email Address', 'Joined Date'];
        case 'verification': return ['User Account', 'Requested Name', 'Reasoning', 'Status', 'Date'];
        case 'notifications': return ['ID', 'Category', 'Target', 'Origin', 'Read', 'Date', 'Message'];
        default: return [];
    }
}

function renderCells(tab: Tab, r: any) {
    const timeClass = "font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase";
    switch (tab) {
        case 'users':
            return [
                <span key="id" className="font-mono text-[11px] text-slate-400">{r.id}</span>,
                <div key="user" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-[10px]">
                        {r.username[0].toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">@{r.username}</span>
                </div>,
                <span key="email" className="font-medium">{r.email}</span>,
                <span key="date" className={timeClass}>{new Date(r.createdAt).toLocaleDateString()}</span>
            ];
        case 'verification':
            return [
                <div className="flex items-center gap-2.5" key="user">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200/50">
                        {r.avatarUrl ? <img src={fixUrl(r.avatarUrl)} className="w-full h-full object-cover" alt="" /> : null}
                    </div>
                    <span className="font-black text-slate-900 dark:text-white text-[13px]">@{r.username}</span>
                </div>,
                <span key="name" className="font-bold">{r.displayName || '-'}</span>,
                <div key="reason" className="max-w-[180px] italic text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                    "{r.reason}"
                </div>,
                <span key="status" className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                        r.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                            'bg-blue-500/10 text-blue-500'
                    }`}>
                    {r.status}
                </span>,
                <span key="date" className={timeClass}>{new Date(r.createdAt).toLocaleDateString()}</span>
            ];
        case 'notifications':
            return [
                <span key="id" className="font-mono text-[10px] opacity-40">{r.id}</span>,
                <span key="type" className="font-black uppercase text-[10px] tracking-widest text-blue-500">{r.type}</span>,
                <span key="to">@{r.toUsername}</span>,
                <span key="from">@{r.fromUsername}</span>,
                <span key="read" className={`text-[10px] font-black uppercase ${r.read ? 'text-slate-300' : 'text-blue-500'}`}>{r.read ? 'Read' : 'Unread'}</span>,
                <span key="date" className={timeClass}>{new Date(r.createdAt).toLocaleDateString()}</span>,
                <div key="msg" className="max-w-[200px] truncate opacity-70 italic">"{r.message}"</div>,
            ];
        default: return [];
    }
}
