/**
 * Utility to fix URLs that might incorrectly point to localhost
 * or other development environments.
 */

export const fixUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
    const BASE_URL = API_URL.replace(/\/api$/, '');
    const OLD_PRODUCTION_URL = 'https://mrohaung.com';

    let fixedUrl = url;
    const PRODUCTION_URL = 'https://mrohaung.com';

    // 1. Replace localhost or 127.0.0.1 with production URL
    if (fixedUrl.includes('localhost') || fixedUrl.includes('127.0.0.1')) {
        fixedUrl = fixedUrl.replace(/http:\/\/localhost:\d+/, PRODUCTION_URL)
            .replace(/http:\/\/127.0.0.1:\d+/, PRODUCTION_URL);
    }

    // 2. Replace old production URL with current if specific legacy one is found
    // (Only if needed, but the main fix is the localhost one)

    // 3. Handle relative paths (e.g., /uploads/...)
    if (fixedUrl.startsWith('/')) {
        fixedUrl = `${PRODUCTION_URL}${fixedUrl}`;
    }

    return fixedUrl;
};

export const formatRelativeTime = (date: string | Date) => {
    const now = new Date();
    const targetDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

    return targetDate.toLocaleDateString();
};
