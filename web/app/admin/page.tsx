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
        <AppShell>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
                    <p className="text-sm text-[#94a3b8]">Manage users and content</p>
                </div>
            </div>

            <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-[#334155] rounded-2xl overflow-hidden">
                <div className="border-b border-[#334155] px-4">
                    <div className="flex flex-wrap gap-2 py-3">
                        <TabButton tab={tab} value="overview" onClick={setTab}>Overview</TabButton>
                        <TabButton tab={tab} value="users" onClick={setTab}>Users</TabButton>
                        <TabButton tab={tab} value="notifications" onClick={setTab}>Notifications</TabButton>
                    </div>
                </div>

                <div className="p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {tab === 'overview' ? (
                        <OverviewPanel loading={loading} overview={overview} />
                    ) : (
                        <>
                            {tab === 'users' && (
                                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                                    <input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Search username or email"
                                        className="flex-1 bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-2 text-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors font-semibold"
                                    >
                                        Search
                                    </button>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[#94a3b8]">
                                            {getColumns(tab).map((c) => (
                                                <th key={c} className="py-2 px-2 font-semibold">{c}</th>
                                            ))}
                                            <th className="py-2 px-2 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#334155]">
                                        {loading ? (
                                            <tr>
                                                <td className="py-6 px-2 text-[#94a3b8]" colSpan={getColumns(tab).length + 1}>Loading...</td>
                                            </tr>
                                        ) : rows.length === 0 ? (
                                            <tr>
                                                <td className="py-6 px-2 text-[#94a3b8]" colSpan={getColumns(tab).length + 1}>No data</td>
                                            </tr>
                                        ) : (
                                            rows.map((r) => (
                                                <tr key={r.id} className="text-white">
                                                    {renderCells(tab, r).map((cell, idx) => (
                                                        <td key={idx} className="py-2 px-2 align-top whitespace-nowrap max-w-[340px] truncate">{cell}</td>
                                                    ))}
                                                    <td className="py-2 px-2 whitespace-nowrap">
                                                        <button
                                                            onClick={() => deleteRow(r.id)}
                                                            disabled={deletingId === r.id}
                                                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-60 transition-colors"
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

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
                                <div className="text-xs text-[#94a3b8]">
                                    Total: {total}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="px-3 py-2 rounded-xl bg-[#334155] hover:bg-[#475569] disabled:opacity-50 transition-colors"
                                    >
                                        Prev
                                    </button>
                                    <div className="text-xs text-[#94a3b8] px-2">
                                        Page {page} / {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="px-3 py-2 rounded-xl bg-[#334155] hover:bg-[#475569] disabled:opacity-50 transition-colors"
                                    >
                                        Next
                                    </button>

                                    <select
                                        value={limit}
                                        onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                                        className="ml-2 bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white"
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
        </AppShell>
    );
}

function TabButton({ tab, value, onClick, children }: { tab: Tab; value: Tab; onClick: (t: Tab) => void; children: React.ReactNode }) {
    const active = tab === value;
    return (
        <button
            onClick={() => onClick(value)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active
                ? 'bg-blue-600/10 text-blue-400'
                : 'bg-transparent text-[#94a3b8] hover:bg-[#334155]/40 hover:text-white'
                }`}
        >
            {children}
        </button>
    );
}

function OverviewPanel({ loading, overview }: { loading: boolean; overview: Overview | null }) {
    if (loading) {
        return <div className="text-[#94a3b8]">Loading...</div>;
    }

    if (!overview) {
        return <div className="text-[#94a3b8]">No data</div>;
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
                <div key={it.label} className="bg-[#0f172a]/60 border border-[#334155] rounded-2xl p-4">
                    <div className="text-sm text-[#94a3b8]">{it.label}</div>
                    <div className="text-3xl font-black text-white mt-2">{it.value}</div>
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
