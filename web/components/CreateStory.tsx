'use client';

import { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import imageCompression from 'browser-image-compression';

interface CreateStoryProps {
    onClose: () => void;
    onStoryCreated?: () => void;
}

export default function CreateStory({ onClose, onStoryCreated }: CreateStoryProps) {
    const [activeTab, setActiveTab] = useState<'media' | 'text'>('media');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [textStory, setTextStory] = useState('');
    const [selectedGradient, setSelectedGradient] = useState('bg-gradient-to-br from-blue-500 to-purple-600');
    const [selectedFont, setSelectedFont] = useState('font-sans');
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);

    const gradients = [
        'bg-gradient-to-br from-blue-500 to-purple-600',
        'bg-gradient-to-br from-pink-500 to-orange-400',
        'bg-gradient-to-br from-indigo-500 to-cyan-400',
        'bg-gradient-to-br from-green-400 to-blue-500',
        'bg-gradient-to-br from-rose-500 to-red-600',
        'bg-gradient-to-br from-slate-900 to-slate-700'
    ];

    const fonts = [
        { name: 'Modern', class: 'font-sans' },
        { name: 'Elegant', class: 'font-serif' },
        { name: 'Code', class: 'font-mono' }
    ];

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: 'image/jpeg'
                };
                const compressedFile = await imageCompression(file, options);
                setImage(compressedFile);
                setImagePreview(URL.createObjectURL(compressedFile));
            } catch (error) {
                console.error('Error compressing image:', error);
                setImage(file);
                setImagePreview(URL.createObjectURL(file));
            }
        }
    };

    const handleSubmit = async () => {
        if (activeTab === 'media' && !image) return;
        if (activeTab === 'text' && !textStory.trim()) return;

        setLoading(true);
        const formData = new FormData();

        if (activeTab === 'media') {
            formData.append('type', 'image');
            if (image) formData.append('media', image);
            if (caption) formData.append('content', caption); // Use content field for caption
        } else {
            formData.append('type', 'text');
            formData.append('content', textStory);
            formData.append('background', selectedGradient);
            formData.append('fontStyle', selectedFont);
        }

        try {
            await api.post('/stories', formData);
            if (onStoryCreated) onStoryCreated();
            onClose();
        } catch (error) {
            console.error('Failed to create story:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#1e293b]">
                    <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Create Story</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-50/50 dark:bg-white/5 p-1 mx-4 mt-4 rounded-xl">
                    <button
                        onClick={() => setActiveTab('media')}
                        className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg ${activeTab === 'media' ? 'bg-white dark:bg-[#334155] text-blue-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Photo / Video
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg ${activeTab === 'text' ? 'bg-white dark:bg-[#334155] text-blue-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Text Story
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {activeTab === 'media' ? (
                        <div className="space-y-4">
                            {!imagePreview ? (
                                <label className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-blue-500 transition-all bg-slate-50/30 dark:bg-white/5 group">
                                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Tap to upload photo</p>
                                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">High quality images recommended</p>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-100 dark:border-white/5">
                                        <img src={imagePreview} alt="Preview" className="w-full h-80 object-cover" />
                                        <button
                                            onClick={() => { setImage(null); setImagePreview(null); }}
                                            className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full hover:bg-black/80 transition-colors"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <input
                                            type="text"
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            placeholder="Write a caption..."
                                            className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Preview Area */}
                            <div className={`w-full h-80 rounded-2xl ${selectedGradient} flex items-center justify-center p-8 text-center shadow-2xl transition-all border border-white/10`}>
                                <textarea
                                    value={textStory}
                                    onChange={(e) => setTextStory(e.target.value)}
                                    placeholder="Start typing..."
                                    className={`w-full h-full bg-transparent border-none outline-none text-white placeholder-white/40 text-2xl font-bold text-center resize-none custom-scrollbar ${selectedFont}`}
                                />
                            </div>

                            {/* Controls */}
                            <div className="space-y-4 px-2">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-3 block">Choose Atmosphere</label>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                        {gradients.map((grad, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedGradient(grad)}
                                                className={`w-11 h-11 rounded-xl ${grad} flex-shrink-0 transition-all duration-300 ${selectedGradient === grad ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-white dark:ring-offset-[#1e293b] scale-105 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-3 block">Text Style</label>
                                    <div className="flex gap-2">
                                        {fonts.map((font) => (
                                            <button
                                                key={font.name}
                                                onClick={() => setSelectedFont(font.class)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedFont === font.class ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-500 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                                            >
                                                {font.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-slate-100 dark:border-white/5 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-bold transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (activeTab === 'media' && !image) || (activeTab === 'text' && !textStory.trim())}
                        className="flex-[2] px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        {loading ? 'Posting...' : 'Share to Story'}
                    </button>
                </div>
            </div>
        </div>
    );
}
