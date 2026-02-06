'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Send, X, Globe, Users, Lock, ChevronDown, Search } from 'lucide-react';
import api from '@/lib/api';
import imageCompression from 'browser-image-compression';

interface CreatePostProps {
    /** Called after post is created. Pass the created post to show it immediately without refresh. */
    onPostCreated?: (newPost?: any) => void;
}

// ~24px per line (15px text + leading-relaxed), 20 lines max
const TEXTAREA_LINE_HEIGHT = 24;
const TEXTAREA_MAX_LINES = 20;
const TEXTAREA_MAX_HEIGHT = TEXTAREA_LINE_HEIGHT * TEXTAREA_MAX_LINES; // 480px
const TEXTAREA_MIN_HEIGHT = 120;

export default function CreatePost({ onPostCreated }: CreatePostProps) {
    const [showModal, setShowModal] = useState(false);
    const [content, setContent] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
    const [tags, setTags] = useState<string>('');
    const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync current user
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        setCurrentUser(user);

        const handleUpdate = () => {
            const updated = JSON.parse(localStorage.getItem('user') || 'null');
            setCurrentUser(updated);
        };

        window.addEventListener('userUpdated', handleUpdate);
        return () => window.removeEventListener('userUpdated', handleUpdate);
    }, []);

    // Draft auto-save: Load saved draft on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem('createPostDraft');
        if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            setContent(draft.content || '');
            setPrivacy(draft.privacy || 'public');
            if (draft.imagePreview) {
                setImagePreview(draft.imagePreview);
            }
            setHasDraft(true);
        }
    }, []);

    // Draft auto-save: Save to localStorage whenever content/privacy/image changes
    useEffect(() => {
        if (showModal) {
            const draft = {
                content,
                privacy,
                imagePreview,
                timestamp: Date.now()
            };
            localStorage.setItem('createPostDraft', JSON.stringify(draft));
            setHasDraft(content.trim().length > 0 || imagePreview !== null);
        }
    }, [content, privacy, imagePreview, showModal]);

    // Mention functionality: search users when typing @
    const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);

    const searchUsers = useCallback(async (query: string) => {
        if (!query.trim()) {
            setMentionSuggestions([]);
            return;
        }
        try {
            const response = await api.get(`/profile/search?q=${encodeURIComponent(query)}&limit=5`);
            setMentionSuggestions(response.data.users || []);
        } catch (error) {
            console.error('Failed to search users:', error);
            setMentionSuggestions([]);
        }
    }, []);

    const handleMentionSelect = (user: any) => {
        const beforeCursor = content.slice(0, cursorPosition - mentionQuery.length - 1);
        const afterCursor = content.slice(cursorPosition);
        const newContent = `${beforeCursor}@${user.username} ${afterCursor}`;
        setContent(newContent);
        setShowMentions(false);
        setMentionQuery('');
        textareaRef.current?.focus();
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursor = e.target.selectionStart;
        setContent(value);
        setCursorPosition(cursor);

        // Check for @ mention
        const beforeCursor = value.slice(0, cursor);
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const afterAt = beforeCursor.slice(lastAtIndex + 1);
            // Only trigger if @ is at word boundary (start or after space)
            const isValidMention = lastAtIndex === 0 || /\s/.test(beforeCursor[lastAtIndex - 1]);
            if (isValidMention && !/\s/.test(afterAt)) {
                setMentionQuery(afterAt);
                setShowMentions(true);
                searchUsers(afterAt);
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const adjustTextareaHeight = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const height = Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_HEIGHT), TEXTAREA_MAX_HEIGHT);
        el.style.height = `${height}px`;
        // ၂၀ ကြောင်းကျော်ရင် အမြင့်မတိုးတော့ဘဲ အတွင်းမှာ scroll
        el.style.overflowY = height >= TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    };

    useEffect(() => {
        if (showModal) adjustTextareaHeight();
    }, [showModal, content]);

    const privacyOptions = [
        { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see' },
        { value: 'friends', label: 'Friends', icon: Users, description: 'Only friends' },
        { value: 'private', label: 'Private', icon: Lock, description: 'Only me' },
    ];

    const currentPrivacy = privacyOptions.find(opt => opt.value === privacy)!;

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Compression options
                const options = {
                    maxSizeMB: 1, // Max file size in MB
                    maxWidthOrHeight: 1920, // Max width or height
                    useWebWorker: true,
                    fileType: 'image/jpeg' // Convert to JPEG for better compression
                };

                // Compress the image
                const compressedFile = await imageCompression(file, options);

                console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

                setImage(compressedFile);
                setImagePreview(URL.createObjectURL(compressedFile));
            } catch (error) {
                console.error('Error compressing image:', error);
                // Fallback to original file if compression fails
                setImage(file);
                setImagePreview(URL.createObjectURL(file));
            }
        }
    };

    const handlePost = async () => {
        if (!content.trim() && !image) return;

        setLoading(true);
        const formData = new FormData();
        if (content.trim()) formData.append('content', content);
        if (image) formData.append('image', image);
        if (tags) formData.append('tags', tags);
        formData.append('privacy', privacy);

        try {
            const response = await api.post('/posts', formData);
            const newPost = response?.data;
            setContent('');
            setImage(null);
            setImagePreview(null);
            setPrivacy('public');
            setTags('');
            setShowModal(false);
            // Clear draft after successful post
            localStorage.removeItem('createPostDraft');
            setHasDraft(false);
            if (onPostCreated) onPostCreated(newPost);
        } catch (error) {
            console.error('Failed to post:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Compact Card - Click to open modal */}
            <div
                onClick={() => setShowModal(true)}
                className="relative bg-gradient-to-br from-[#1e293b]/60 to-[#0f172a]/40 backdrop-blur-xl border border-[#334155]/50 rounded-3xl p-5 mb-6 overflow-visible hover:border-[#475569]/70 transition-all duration-300 cursor-pointer"
            >
                <div className="flex gap-4 items-center">
                    <div className="w-11 h-11 rounded-full border-2 border-[#1e293b] flex-shrink-0 ring-2 ring-blue-500/10 overflow-hidden">
                        {currentUser?.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {(currentUser?.displayName || currentUser?.username)?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-[#0f172a]/50 border border-[#334155]/50 rounded-full px-4 py-3 text-[#64748b] text-[15px] hover:border-[#475569]/70 transition-colors">
                        What's on your mind?
                    </div>
                </div>
            </div>

            {/* Modal Popup */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 p-0">
                    <div className="bg-[#1e293b] sm:border border-none border-[#334155]/60 sm:rounded-3xl rounded-none w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                        {/* Mobile Sticky Header */}
                        <div className="sm:hidden sticky top-0 z-[50] bg-[#1e293b] px-4 h-[44px] flex-shrink-0 flex items-center justify-between border-b border-[#334155]/20">
                            <h2 className="text-[15px] font-bold text-white tracking-wide">Create Post</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 flex items-center justify-center bg-[#334155]/50 hover:bg-[#475569]/70 rounded-full text-[#94a3b8] hover:text-white transition-all duration-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden sm:flex items-center justify-between px-6 py-3 border-b border-[#334155]/50 bg-[#1e293b]">
                            <h2 className="text-lg font-bold text-white tracking-tight">Create Post</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-9 h-9 flex items-center justify-center hover:bg-[#334155] rounded-full text-[#94a3b8] hover:text-white transition-all duration-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#1e293b]">
                            {/* User Header Section - Sticky for Mobile, Normal Flow for Desktop */}
                            <div className="sm:relative sticky top-0 z-[40] bg-[#1e293b] px-4 sm:px-6 sm:py-2.5 pt-8 pb-2.5 mt-0 flex items-center justify-between sm:border-none border-b border-[#334155]/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-[#334155] flex-shrink-0 ring-2 ring-blue-500/10 overflow-hidden">
                                        {currentUser?.avatarUrl ? (
                                            <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                                {(currentUser?.displayName || currentUser?.username)?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowPrivacyMenu(!showPrivacyMenu); }}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-[#334155]/30 hover:bg-[#334155]/50 rounded-xl transition-colors group sm:w-auto w-auto"
                                        >
                                            <currentPrivacy.icon className="sm:w-4 sm:h-4 w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                            <span className="sm:text-sm text-[13px] font-semibold text-[#e2e8f0]">{currentPrivacy.label}</span>
                                            <ChevronDown className="sm:w-4 sm:h-4 w-3.5 h-3.5 text-[#64748b] ml-0.5" />
                                        </button>
                                        {showPrivacyMenu && (
                                            <>
                                                <div className="absolute top-full left-0 mt-1 w-56 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl overflow-hidden z-20">
                                                    {privacyOptions.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                setPrivacy(option.value as any);
                                                                setShowPrivacyMenu(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#334155]/50 transition-colors text-left"
                                                        >
                                                            <option.icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-white">{option.label}</p>
                                                                <p className="text-xs text-[#64748b]">{option.description}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="fixed inset-0 z-10" onClick={() => setShowPrivacyMenu(false)} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Post Input Area */}
                            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    placeholder="What's on your mind?"
                                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-white placeholder-[#64748b] resize-none py-2 sm:text-[18px] text-[16px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                    style={{ minHeight: TEXTAREA_MIN_HEIGHT, maxHeight: TEXTAREA_MAX_HEIGHT }}
                                    rows={1}
                                    autoFocus
                                    maxLength={65000}
                                />
                            </div>

                            {/* Mention Dropdown */}
                            {showMentions && mentionSuggestions.length > 0 && (
                                <div className="relative mt-1">
                                    <div className="absolute top-0 left-0 w-full bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                                        {mentionSuggestions.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => handleMentionSelect(user)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#334155]/50 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{user.displayName || user.username}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMentions(false)} />
                                </div>
                            )}

                            {imagePreview && (
                                <div className="relative mt-3 rounded-xl overflow-hidden border border-[#334155]/50 group">
                                    <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-96 object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <button
                                        onClick={() => { setImage(null); setImagePreview(null); }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/70 backdrop-blur-sm text-white rounded-full hover:bg-black/90 transition-all transform hover:scale-110"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                        </div>

                        {/* Footer / Actions */}
                        <div className="p-4 sm:p-5 border-t border-[#334155]/50 bg-[#1e293b] space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2.5 px-4 py-2 bg-[#334155]/30 hover:bg-[#334155]/50 rounded-xl cursor-pointer transition-all group border border-[#334155]/20">
                                    <ImageIcon className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-semibold text-[#e2e8f0]">Add Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>

                                {image && (
                                    <span className="text-[12px] text-blue-400 font-medium">Image selected</span>
                                )}
                            </div>

                            <button
                                onClick={handlePost}
                                disabled={(!content.trim() && !image) || loading}
                                className="w-full h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-1" />
                                        <span>Post to Newsfeed</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
