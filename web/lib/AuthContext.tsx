'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface AuthContextType {
    user: any | null;
    token: string | null;
    loading: boolean;
    login: (token: string, user: any) => void;
    logout: () => void;
    updateUser: (userData: any) => void;
    openAuthModal: (mode?: 'login' | 'register') => void;
    closeAuthModal: () => void;
    isAuthModalOpen: boolean;
    authModalMode: 'login' | 'register';
    modalTitle: string | null;
    requireAuth: (action: () => void, title?: string) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken === 'undefined' || savedUser === 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } else if (savedToken && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                if (parsedUser && typeof parsedUser === 'object') {
                    setToken(savedToken);
                    setUser(parsedUser);

                    // Optionally verify token/sync user data with backend
                    api.get('/auth/me').then(res => {
                        const latestUser = res.data;
                        setUser(latestUser);
                        localStorage.setItem('user', JSON.stringify(latestUser));
                    }).catch(() => {
                        // Token might be expired or server down
                    });
                } else {
                    localStorage.removeItem('user');
                }
            } catch (e) {
                console.error('Failed to parse saved user:', e);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = (newToken: string, userData: any) => {
        if (!userData || typeof userData !== 'object') {
            console.error('Invalid user data provided to login:', userData);
            return;
        }

        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        router.push('/');
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const updateUser = (userData: any) => {
        if (!userData) return;
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
    const [modalTitle, setModalTitle] = useState<string | null>(null);

    const openAuthModal = (mode: 'login' | 'register' = 'login') => {
        setAuthModalMode(mode);
        setModalTitle(null); // Clear custom title if opened normally
        setIsAuthModalOpen(true);
    };

    const closeAuthModal = () => {
        setIsAuthModalOpen(false);
        setModalTitle(null);
    };

    const requireAuth = (action: () => void, title?: string) => {
        if (user) {
            action();
        } else {
            setModalTitle(title || 'Authorization Required');
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
        }
    };

    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/me');
            const latestUser = res.data;
            setUser(latestUser);
            localStorage.setItem('user', JSON.stringify(latestUser));
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user, token, loading, login, logout, updateUser,
            openAuthModal, closeAuthModal, isAuthModalOpen, authModalMode,
            modalTitle, requireAuth, refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
