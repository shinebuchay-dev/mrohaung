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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1e293b] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#334155] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#334155]">
                    <h2 className="text-xl font-bold text-white">Create Story</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[#334155] rounded-full transition-colors">
                        <X className="w-5 h-5 text-[#94a3b8]" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#334155]">
                    <button
                        onClick={() => setActiveTab('media')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'media' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-[#64748b] hover:text-[#94a3b8]'}`}
                    >
                        Photo / Video
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'text' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-[#64748b] hover:text-[#94a3b8]'}`}
                    >
                        Text Story
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'media' ? (
                        <div className="space-y-4">
                            {!imagePreview ? (
                                <label className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-[#334155] rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-[#0f172a]/50">
                                    <Upload className="w-12 h-12 text-[#64748b] mb-4" />
                                    <p className="text-[#94a3b8] font-medium">Upload Image</p>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative rounded-xl overflow-hidden shadow-lg">
                                        <img src={imagePreview} alt="Preview" className="w-full h-80 object-cover" />
                                        <button
                                            onClick={() => { setImage(null); setImagePreview(null); }}
                                            className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        placeholder="Add a caption..."
                                        className="w-full bg-[#0f172a] border border-[#334155] rounded-xl text-white placeholder-[#64748b] px-4 py-3 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Preview Area */}
                            <div className={`w-full h-80 rounded-xl ${selectedGradient} flex items-center justify-center p-8 text-center shadow-lg transition-all`}>
                                <textarea
                                    value={textStory}
                                    onChange={(e) => setTextStory(e.target.value)}
                                    placeholder="Type something..."
                                    className={`w-full h-full bg-transparent border-none outline-none text-white placeholder-white/50 text-2xl font-bold text-center resize-none ${selectedFont}`}
                                />
                            </div>

                            {/* Controls */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2 block">Background</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                        {gradients.map((grad, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedGradient(grad)}
                                                className={`w-10 h-10 rounded-full ${grad} flex-shrink-0 ring-2 transition-all ${selectedGradient === grad ? 'ring-white scale-110' : 'ring-transparent hover:scale-105'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2 block">Font Style</label>
                                    <div className="flex gap-2">
                                        {fonts.map((font) => (
                                            <button
                                                key={font.name}
                                                onClick={() => setSelectedFont(font.class)}
                                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${selectedFont === font.class ? 'bg-[#334155] text-white border-blue-500' : 'bg-[#0f172a] text-[#94a3b8] border-[#334155] hover:bg-[#1e293b]'}`}
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
                <div className="p-4 border-t border-[#334155] flex gap-3 bg-[#0f172a]/50">
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#334155] hover:bg-[#475569] text-white rounded-xl font-medium transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (activeTab === 'media' && !image) || (activeTab === 'text' && !textStory.trim())}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        {loading ? 'Posting...' : 'Share to Story'}
                    </button>
                </div>
            </div>
        </div>
    );
}
