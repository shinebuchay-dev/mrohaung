'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { openAuthModal, user } = useAuth();

    useEffect(() => {
        if (user) {
            router.replace('/');
        } else {
            openAuthModal('login');
            router.replace('/');
        }
    }, []);

    return null;
}
