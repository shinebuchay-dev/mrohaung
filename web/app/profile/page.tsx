'use client';

import { Suspense } from 'react';
import ProfilePageContent from '@/components/ProfilePageContent';

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 font-medium animate-pulse tracking-wide uppercase text-xs">Loading Profile Interface...</p>
        </div>}>
            <ProfilePageContent />
        </Suspense>
    );
}
