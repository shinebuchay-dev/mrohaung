'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface AuthPageContentProps {
    initialMode?: 'login' | 'register';
}

export default function AuthPageContent({ initialMode = 'login' }: AuthPageContentProps) {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#020617] relative p-4 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[420px] bg-slate-50 dark:bg-[#0f172a]/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] p-8 md:p-10 relative z-10"
            >
                {/* Form Switcher */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {mode === 'login' ? (
                            <LoginForm
                                onSwitchToRegister={() => setMode('register')}
                                onSuccess={() => {/* Redirect handled inside */ }}
                            />
                        ) : (
                            <RegisterForm
                                onSwitchToLogin={() => setMode('login')}
                                onSuccess={() => setMode('login')}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center text-slate-500 text-xs font-medium">
                &copy; 2024 MROHAUNG. Secured by Nexus Protocol.
            </div>
        </div>
    );
}
