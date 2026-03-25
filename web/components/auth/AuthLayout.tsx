import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    sideContent?: React.ReactNode;
}

export default function AuthLayout({ children, title, subtitle, sideContent }: AuthLayoutProps) {
    return (
        <div className="min-h-[100dvh] flex flex-col md:flex-row bg-[#020617] relative overflow-hidden selection:bg-indigo-500/30">
            {/* Animated Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[140px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.5, 1],
                        rotate: [0, -90, 0],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[140px]"
                />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] blend-overlay" />
            </div>

            {/* Left Side: Brand & Info (Desktop Only) */}
            <div className="hidden md:flex flex-1 flex-col justify-center px-12 lg:px-24 z-10 relative">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 transform -rotate-6">
                            <ShieldCheck className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic tracking-tighter">
                            MROHAUNG
                        </span>
                    </div>

                    {sideContent || (
                        <>
                            <h2 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
                                Experience <br />
                                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                                    Digital Freedom
                                </span>
                            </h2>
                            <p className="text-xl text-slate-400 mb-10 max-w-md leading-relaxed">
                                Connect, share, and belong in a community built for the next generation of social interaction.
                            </p>
                        </>
                    )}
                </motion.div>
            </div>

            {/* Right Side: Form (Full-screen on Mobile) */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10 relative md:min-h-screen">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "backOut" }}
                    className="w-full max-w-[480px] p-8 md:p-10 rounded-[2.5rem] bg-[#0f172a]/60 backdrop-blur-3xl border border-white/10 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
                >
                    <div className="text-center mb-10">
                        <div className="md:hidden flex justify-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 transform -rotate-3 text-white">
                                <Sparkles className="w-8 h-8" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">{title}</h1>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{subtitle}</p>
                    </div>

                    {children}
                </motion.div>
            </div>
        </div>
    );
}
