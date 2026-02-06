'use client';

import { motion } from 'framer-motion';

const STICKERS = [
    { id: '1', url: 'https://cdn-icons-png.flaticon.com/512/742/742751.png', name: 'Smile' },
    { id: '2', url: 'https://cdn-icons-png.flaticon.com/512/742/742752.png', name: 'Laugh' },
    { id: '3', url: 'https://cdn-icons-png.flaticon.com/512/742/742921.png', name: 'Love' },
    { id: '4', url: 'https://cdn-icons-png.flaticon.com/512/742/742760.png', name: 'Cool' },
    { id: '5', url: 'https://cdn-icons-png.flaticon.com/512/742/742822.png', name: 'Wink' },
    { id: '6', url: 'https://cdn-icons-png.flaticon.com/512/742/742939.png', name: 'Surprise' },
    { id: '7', url: 'https://cdn-icons-png.flaticon.com/512/742/742750.png', name: 'Sad' },
    { id: '8', url: 'https://cdn-icons-png.flaticon.com/512/742/742785.png', name: 'Angry' },
    { id: '9', url: 'https://cdn-icons-png.flaticon.com/512/9205/9205047.png', name: 'Party' },
    { id: '10', url: 'https://cdn-icons-png.flaticon.com/512/9205/9205260.png', name: 'Ghost' },
    { id: '11', url: 'https://cdn-icons-png.flaticon.com/512/9205/9205089.png', name: 'Fire' },
    { id: '12', url: 'https://cdn-icons-png.flaticon.com/512/9205/9205423.png', name: 'Star' },
];

interface StickerPickerProps {
    onSelect: (url: string) => void;
    onClose: () => void;
}

export default function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-14 right-0 bg-[#1e293b] border border-[#334155] rounded-2xl shadow-xl w-64 p-3 z-50 overflow-hidden"
            >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#334155]">
                    <span className="text-xs font-bold text-[#94a3b8]">Stickers</span>
                    <button onClick={onClose} className="text-[#64748b] hover:text-white">
                        <span className="sr-only">Close</span>
                        &times;
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-2 h-48 overflow-y-auto pr-1">
                    {STICKERS.map((sticker) => (
                        <button
                            key={sticker.id}
                            onClick={() => {
                                onSelect(sticker.url);
                                onClose();
                            }}
                            className="aspect-square p-1.5 hover:bg-[#334155] rounded-xl transition-colors flex items-center justify-center group"
                        >
                            <img
                                src={sticker.url}
                                alt={sticker.name}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                                onError={(e) => {
                                    // Fallback if image fails
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${sticker.name}&background=random`
                                }}
                            />
                        </button>
                    ))}
                </div>
            </motion.div>
        </>
    );
}
