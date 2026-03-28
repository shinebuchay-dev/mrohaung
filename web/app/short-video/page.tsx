'use client';

import { Play, Flame, TrendingUp, Clock, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ShortVideoPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full bg-white dark:bg-[#1e293b] rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-white/10"
            >
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="w-10 h-10 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
                </div>
                
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                    Short Video Feed
                </h1>
                
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed mb-8">
                    Discover amazing short moments from the Mrohaung community. Our full-screen video experience is coming soon!
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                        <Flame className="w-6 h-6 text-orange-500 mb-2" />
                        <span className="text-xs font-bold text-slate-400">Trending</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                        <TrendingUp className="w-6 h-6 text-emerald-500 mb-2" />
                        <span className="text-xs font-bold text-slate-400">Viral</span>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20" />
                    <button className="relative w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-blue-500/20 transition-all active:scale-[0.98]">
                        Join the Beta
                    </button>
                </div>
            </motion.div>

            <div className="mt-12 flex items-center gap-8 opacity-40 grayscale pointer-events-none">
                <div className="hidden sm:block h-[300px] w-[180px] bg-slate-200 dark:bg-slate-800 rounded-[32px] overflow-hidden border-4 border-slate-300 dark:border-slate-700">
                    <div className="h-full w-full bg-gradient-to-t from-slate-400 to-transparent" />
                </div>
                <div className="h-[400px] w-[220px] bg-slate-200 dark:bg-slate-800 rounded-[40px] overflow-hidden border-4 border-slate-300 dark:border-slate-700 ring-8 ring-blue-500/10">
                    <div className="h-full w-full bg-gradient-to-t from-slate-500 to-transparent" />
                </div>
                <div className="hidden sm:block h-[300px] w-[180px] bg-slate-200 dark:bg-slate-800 rounded-[32px] overflow-hidden border-4 border-slate-300 dark:border-slate-700">
                    <div className="h-full w-full bg-gradient-to-t from-slate-400 to-transparent" />
                </div>
            </div>
        </div>
    );
}
