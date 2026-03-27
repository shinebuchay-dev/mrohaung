'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LoginForm from './auth/LoginForm';
import RegisterForm from './auth/RegisterForm';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive detection
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync mode with initialMode if it changes while open
    useEffect(() => {
        if (isOpen) setMode(initialMode);
    }, [isOpen, initialMode]);

    const mobileVariants: any = {
        hidden: { y: '100%' },
        visible: {
            y: 0,
            transition: {
                type: 'spring',
                damping: 25,
                stiffness: 200
            }
        },
        exit: {
            y: '100%',
            transition: { duration: 0.3, ease: 'easeInOut' }
        }
    };

    const desktopVariants: any = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: 'spring',
                damping: 25,
                stiffness: 300
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className={cn(
                            "absolute inset-0 transition-all duration-500",
                            isMobile ? "bg-white/10 backdrop-blur-xl" : "bg-black/40 backdrop-blur-md"
                        )}
                    />

                    {/* Modal Content */}
                    <motion.div
                        variants={isMobile ? mobileVariants : desktopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout // Enables smooth height animation
                        className={cn(
                            "relative z-50 overflow-hidden flex flex-col",
                            isMobile
                                ? "absolute bottom-0 w-full bg-slate-50 dark:bg-[#0b1120] backdrop-blur-xl rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] border-t border-slate-200 dark:border-white/5"
                                : "max-w-[420px] w-full bg-slate-50 dark:bg-[#0b1120] backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5"
                        )}
                        style={{ maxHeight: isMobile ? '85vh' : 'auto' }}
                    >
                        {/* Content Scroll Wrapper */}
                        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                            <div className="p-8 md:p-10 relative">
                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-6 right-6 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-95 z-50"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {/* Forms (Toggle Logic Removed - Only Login Shown, Sign Up via separate button) */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={mode}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {mode === 'login' ? (
                                            <LoginForm
                                                onSuccess={onClose}
                                                onSwitchToRegister={() => setMode('register')} // Pass setMode to switch locally if needed, or route
                                            />
                                        ) : (
                                            <RegisterForm
                                                onSuccess={onClose}
                                                onSwitchToLogin={() => setMode('login')}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
