'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function RegisterPage() {
    const router = useRouter();
    const { openAuthModal, user } = useAuth();

    useEffect(() => {
        if (user) {
            router.replace('/');
        } else {
            openAuthModal('register');
            router.replace('/');
        }
    }, []);

    return null;
}
