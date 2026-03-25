'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import api from '@/lib/api';

type Tab = 'overview' | 'users' | 'notifications';

type Overview = {
    counts: {
        users: number;
        posts: number;
        comments: number;
        stories: number;
        messages: number;
        notifications: number;
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
        };

        const res = await api.get(urlMap[tab], { params });

        const listKeyMap: Record<string, string> = {
            users: 'users',
            notifications: 'notifications',
        };

        setRows(res.data[listKeyMap[tab]] || []);
        setTotal(res.data.total || 0);
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
                const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Request failed';
                setError(msg);
                setRows([]);
                setTotal(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, page, limit]);

    useEffect(() => {
        setPage(1);
        setRows([]);
        setTotal(0);
    }, [tab]);

    const deleteRow = async (id: string) => {
        const confirmText = `Delete this ${tab.slice(0, -1)}?`;
        if (!confirm(confirmText)) return;

        setDeletingId(id);
        setError('');

        const deleteUrlMap: Record<string, (id: string) => string> = {
            users: (x) => `/admin/users/${x}`,
            notifications: (x) => `/admin/notifications/${x}`,
        };

        try {
            await api.delete(deleteUrlMap[tab](id));
            await fetchList();
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Delete failed';
            setError(msg);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-8 mt-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Admin Dashboard</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage users and content</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="border-b border-slate-100 dark:border-white/5 px-5">
                    <div className="flex flex-wrap gap-2 py-4">
                        <TabButton tab={tab} value="overview" onClick={setTab}>Overview</TabButton>
                        <TabButton tab={tab} value="users" onClick={setTab}>Users</TabButton>
                        <TabButton tab={tab} value="notifications" onClick={setTab}>Notifications</TabButton>
                    </div>
                </div>

                <div className="p-5">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {tab === 'overview' ? (
                        <OverviewPanel loading={loading} overview={overview} />
                    ) : (
                        <>
                            {tab === 'users' && (
                                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
                                    <input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Search username or email"
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium text-sm"
                                    />
                                    <button
                                        onClick={() => {
                                            setPage(1);
                                            setLoading(true);
                                            setError('');
                                            fetchList().catch((e) => {
                                                const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Request failed';
                                                setError(msg);
                                            }).finally(() => setLoading(false));
                                        }}
                                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors font-bold text-sm shadow-sm"
                                    >
                                        Search
                                    </button>
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/5">
                                        <tr>
                                            {getColumns(tab).map((c) => (
                                                <th key={c} className="py-3 px-4 font-bold">{c}</th>
                                            ))}
                                            <th className="py-3 px-4 font-bold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-medium" colSpan={getColumns(tab).length + 1}>Loading...</td>
                                            </tr>
                                        ) : rows.length === 0 ? (
                                            <tr>
                                                <td className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-medium" colSpan={getColumns(tab).length + 1}>No data</td>
                                            </tr>
                                        ) : (
                                            rows.map((r) => (
                                                <tr key={r.id} className="text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    {renderCells(tab, r).map((cell, idx) => (
                                                        <td key={idx} className="py-3 px-4 align-top whitespace-nowrap max-w-[340px] truncate">{cell}</td>
                                                    ))}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => deleteRow(r.id)}
                                                            disabled={deletingId === r.id}
                                                            className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors font-bold text-xs"
                                                        >
                                                            {deletingId === r.id ? 'Deleting…' : 'Delete'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
                                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Total: {total}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors font-semibold text-sm"
                                    >
                                        Prev
                                    </button>
                                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 px-3">
                                        Page {page} of {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors font-semibold text-sm"
                                    >
                                        Next
                                    </button>

                                    <select
                                        value={limit}
                                        onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                                        className="ml-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        {[10, 20, 50, 100].map((n) => (
                                            <option key={n} value={n}>{n} / page</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

function TabButton({ tab, value, onClick, children }: { tab: Tab; value: Tab; onClick: (t: Tab) => void; children: React.ReactNode }) {
    const active = tab === value;
    return (
        <button
            onClick={() => onClick(value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${active
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
        >
            {children}
        </button>
    );
}

function OverviewPanel({ loading, overview }: { loading: boolean; overview: Overview | null }) {
    if (loading) {
        return <div className="text-slate-500 dark:text-[#94a3b8]">Loading...</div>;
    }

    if (!overview) {
        return <div className="text-slate-500 dark:text-[#94a3b8]">No data</div>;
    }

    const items = [
        { label: 'Users', value: overview.counts.users },
        { label: 'Posts', value: overview.counts.posts },
        { label: 'Comments', value: overview.counts.comments },
        { label: 'Stories', value: overview.counts.stories },
        { label: 'Messages', value: overview.counts.messages },
        { label: 'Notifications', value: overview.counts.notifications },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
                <div key={it.label} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{it.label}</div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{it.value}</div>
                </div>
            ))}
        </div>
    );
}

function getColumns(tab: Tab) {
    switch (tab) {
        case 'users':
            return ['ID', 'Username', 'Email', 'Created'];
        case 'notifications':
            return ['ID', 'Type', 'To', 'From', 'Read', 'Created', 'Message'];
        default:
            return [];
    }
}

function renderCells(tab: Tab, r: any) {
    switch (tab) {
        case 'users':
            return [r.id, r.username, r.email, new Date(r.createdAt).toLocaleString()];
        case 'notifications':
            return [
                r.id,
                r.type,
                r.toUsername,
                r.fromUsername,
                r.read ? 'yes' : 'no',
                new Date(r.createdAt).toLocaleString(),
                r.message,
            ];
        default:
            return [];
    }
}
