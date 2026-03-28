/**
 * Utility to fix image/media URLs from Cloudflare R2 and legacy storage.
 *
 * Handles:
 *  - Broken custom domain (media.mrohaung.com) → replace with r2.dev
 *  - Bare R2 paths like "Post/user/uuid.jpg" → prepend r2.dev
 *  - Bare UUID filenames like "uuid.jpg" → prepend r2.dev
 *  - localhost backend URLs → replace with production host
 *  - Relative paths like "/uploads/..." → prepend API host
 */

// The actual working Cloudflare R2 public URL
const R2_PUBLIC_BASE = 'https://pub-e61e1977203c41d499155e42c923617c.r2.dev';

// Broken/legacy domains that were mistakenly stored in the DB as R2_PUBLIC_URL
const BROKEN_R2_DOMAINS = [
    'https://media.mrohaung.com',
    'http://media.mrohaung.com',
];

// R2 folder prefixes — a path starting with these is a bare R2 key (no domain)
const R2_PATH_PREFIXES = ['Post/', 'Profile/', 'Cover/', 'Message/', 'Story/', 'Comment/'];

// Bare UUID filename: "61f91008-cc64-4348-97cb-7f795d21ddb7.jpg"
const BARE_FILENAME_RE = /^[0-9a-f-]{36}\.(jpg|jpeg|png|gif|webp|mp4|mov|svg)$/i;

export const fixUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;

    // Guard: blob: URLs are temporary — never use as a remote URL
    if (url.startsWith('blob:')) {
        console.warn('[fixUrl] Blocked blob: URL:', url);
        return undefined;
    }

    // 1. Replace broken legacy custom domain with working r2.dev URL
    //    e.g. "https://media.mrohaung.com/Post/user/uuid.jpg"
    //      → "https://pub-xxx.r2.dev/Post/user/uuid.jpg"
    for (const broken of BROKEN_R2_DOMAINS) {
        if (url.startsWith(broken)) {
            return R2_PUBLIC_BASE + url.slice(broken.length);
        }
    }

    // 2. Already a fully-qualified URL — return as-is (unless localhost)
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.162.62.45/api';
        const PRODUCTION_URL = API_URL.replace(/\/api$/, '');
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
            return url.replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/, PRODUCTION_URL);
        }
        return url;
    }

    // 3. Bare R2 key path (no domain): "Post/shinebuchay/uuid.jpg"
    if (R2_PATH_PREFIXES.some((prefix) => url.startsWith(prefix))) {
        return `${R2_PUBLIC_BASE}/${url}`;
    }

    // 4. Bare UUID filename: "61f91008-cc64-4348-97cb-7f795d21ddb7.jpg"
    if (BARE_FILENAME_RE.test(url)) {
        return `${R2_PUBLIC_BASE}/${url}`;
    }

    // 5. Relative server path: "/uploads/something.jpg"
    if (url.startsWith('/')) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.162.62.45/api';
        const PRODUCTION_URL = API_URL.replace(/\/api$/, '');
        return `${PRODUCTION_URL}${url}`;
    }

    return url;
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
