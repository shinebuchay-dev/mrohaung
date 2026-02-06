'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon, X, User, Hash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface SearchResult {
    type: 'user' | 'post';
    id: string;
    username?: string;
    title: string;
    subtitle?: string;
    avatarUrl?: string;
}

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const searchTimeout = setTimeout(async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                // Search users
                const usersRes = await api.get(`/profile/search?q=${encodeURIComponent(query)}`);
                const userResults: SearchResult[] = usersRes.data.map((user: any) => ({
                    type: 'user',
                    id: user.id,
                    username: user.username,
                    title: user.displayName || user.username,
                    subtitle: user.email,
                    avatarUrl: user.avatarUrl
                }));

                setResults(userResults);
            } catch (error) {
                console.error('Search failed:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [query]);

    const handleResultClick = (result: SearchResult) => {
        if (result.type === 'user') {
            router.push(`/profile/${result.username || result.id}`);
        }
        setQuery('');
        setShowResults(false);
    };

    return (
        <div className="relative flex-1 max-w-sm">
            <div className="relative group">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] group-focus-within:text-blue-500 transition-colors" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    placeholder="Search people, posts..."
                    className="w-full bg-[#1e293b] border-none rounded-full pl-10 pr-10 py-2 text-sm focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setResults([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#334155] rounded-full transition-colors"
                    >
                        <X className="w-3 h-3 text-[#64748b]" />
                    </button>
                )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && query.trim().length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-[#1e293b] border border-[#334155] rounded-2xl shadow-xl overflow-hidden z-50">
                    {loading ? (
                        <div className="p-4 text-center text-[#64748b]">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : results.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleResultClick(result)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#334155] transition-colors text-left"
                                >
                                    {result.type === 'user' ? (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-[#334155] overflow-hidden flex-shrink-0">
                                                {result.avatarUrl ? (
                                                    <img src={result.avatarUrl} alt={result.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                                        <span className="text-white font-bold">{result.title[0].toUpperCase()}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold truncate">{result.title}</p>
                                                {result.subtitle && (
                                                    <p className="text-xs text-[#64748b] truncate">{result.subtitle}</p>
                                                )}
                                            </div>
                                            <User className="w-4 h-4 text-[#64748b] flex-shrink-0" />
                                        </>
                                    ) : (
                                        <>
                                            <Hash className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white truncate">{result.title}</p>
                                            </div>
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-[#64748b]">
                            No results found
                        </div>
                    )}
                </div>
            )}

            {/* Backdrop to close results */}
            {showResults && query && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowResults(false)}
                />
            )}
        </div>
    );
}
