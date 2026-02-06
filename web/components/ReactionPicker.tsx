'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Laugh, ThumbsUp, Frown, Angry, Star } from 'lucide-react';

interface ReactionPickerProps {
    onSelect: (type: string) => void;
    onClose: () => void;
}

const reactions = [
    { type: 'like', icon: ThumbsUp, color: 'text-blue-500', label: 'Like' },
    { type: 'love', icon: Heart, color: 'text-red-500', label: 'Love' },
    { type: 'haha', icon: Laugh, color: 'text-yellow-500', label: 'Haha' },
    { type: 'wow', icon: Star, color: 'text-purple-500', label: 'Wow' },
    { type: 'sad', icon: Frown, color: 'text-blue-400', label: 'Sad' },
    { type: 'angry', icon: Angry, color: 'text-orange-500', label: 'Angry' },
];

export default function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
    return (
        <div className="absolute bottom-full left-0 mb-2 z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="bg-[#1e293b] border border-[#334155] rounded-full p-1.5 shadow-xl flex items-center gap-0.5 backdrop-blur-xl"
                onMouseLeave={onClose}
            >
                {reactions.map((reaction, index) => (
                    <motion.button
                        key={reaction.type}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.2, y: -5 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(reaction.type);
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors relative group tooltip-container"
                        title={reaction.label}
                    >
                        <reaction.icon className={`w-[22px] h-[22px] ${reaction.color}`} fill={reaction.type === 'love' ? 'currentColor' : 'none'} />
                    </motion.button>
                ))}
            </motion.div>
        </div>
    );
}
