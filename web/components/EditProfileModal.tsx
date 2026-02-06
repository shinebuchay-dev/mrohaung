'use client';

import { useEffect, useState } from 'react';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import imageCompression from 'browser-image-compression';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
    onUpdate: () => void;
    initialAvatar?: File | null;
    initialCover?: File | null;
}

export default function EditProfileModal({ isOpen, onClose, currentUser, onUpdate, initialAvatar, initialCover }: EditProfileModalProps) {
    const [bio, setBio] = useState(currentUser?.bio || '');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [cover, setCover] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialAvatar) {
                setAvatar(initialAvatar);
                setPreview(URL.createObjectURL(initialAvatar));
            }
            if (initialCover) {
                setCover(initialCover);
                setCoverPreview(URL.createObjectURL(initialCover));
            }
        } else {
            // Reset when closing
            setAvatar(null);
            setPreview(null);
            setCover(null);
            setCoverPreview(null);
        }
    }, [isOpen, initialAvatar, initialCover]);

    if (!isOpen) return null;

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const options = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 400,
                    useWebWorker: true,
                    fileType: 'image/jpeg'
                };

                const compressedFile = await imageCompression(file, options);
                setAvatar(compressedFile);
                setPreview(URL.createObjectURL(compressedFile));
            } catch (error) {
                console.error('Error compressing avatar:', error);
                setAvatar(file);
                setPreview(URL.createObjectURL(file));
            }
        }
    };

    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const options = {
                    maxSizeMB: 0.8,
                    maxWidthOrHeight: 1200,
                    useWebWorker: true,
                    fileType: 'image/jpeg'
                };

                const compressedFile = await imageCompression(file, options);
                setCover(compressedFile);
                setCoverPreview(URL.createObjectURL(compressedFile));
            } catch (error) {
                console.error('Error compressing cover:', error);
                setCover(file);
                setCoverPreview(URL.createObjectURL(file));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append('bio', bio);
        if (avatar) formData.append('avatar', avatar);
        if (cover) formData.append('cover', cover);

        try {
            const response = await api.put('/profile', formData);
            // Update local storage with new user data
            const updatedUser = response.data;
            if (updatedUser) {
                const currentLocalUser = JSON.parse(localStorage.getItem('user') || '{}');
                // Ensure we merge carefully, keeping any local-only data if necessary, 
                // but prioritizing the fresh data from the server.
                localStorage.setItem('user', JSON.stringify({ ...currentLocalUser, ...updatedUser }));
                window.dispatchEvent(new Event('userUpdated'));
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to update profile:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1e293b] border border-[#334155] rounded-3xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#334155]">
                    <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#334155] rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-[#94a3b8]" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh] no-scrollbar">
                    {/* Cover Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#94a3b8]">Cover Photo</label>
                        <div className="relative h-32 w-full rounded-xl overflow-hidden bg-[#0f172a] border border-[#334155]">
                            {coverPreview || currentUser?.coverUrl ? (
                                <img
                                    src={coverPreview || currentUser.coverUrl}
                                    alt="Cover preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-[#334155]" />
                                </div>
                            )}
                            <label className="absolute bottom-2 right-2 p-2 bg-blue-600 hover:bg-blue-700 rounded-full cursor-pointer transition-colors shadow-lg">
                                <Upload className="w-4 h-4 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#334155] border-4 border-[#1e293b]">
                                {preview || currentUser?.avatarUrl ? (
                                    <img
                                        src={preview || currentUser.avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                        <span className="text-3xl font-bold text-white">
                                            {(currentUser?.displayName || currentUser?.username)?.[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 rounded-full cursor-pointer transition-colors">
                                <Upload className="w-4 h-4 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <p className="text-sm text-[#64748b]">Click to upload new avatar</p>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#94a3b8]">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-32"
                            maxLength={160}
                        />
                        <p className="text-xs text-[#64748b] text-right">{bio.length}/160</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-[#334155] hover:bg-[#475569] text-white font-semibold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
