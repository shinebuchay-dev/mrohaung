'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Send, X, Globe, Users, Lock, ChevronDown, Search } from 'lucide-react';
import api from '@/lib/api';
import imageCompression from 'browser-image-compression';
import { fixUrl } from '@/lib/utils';

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
                className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-3xl p-4 sm:p-5 mb-6 shadow-sm hover:shadow-md transition-shadow cursor-text"
            >
                <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex-shrink-0 bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-white/5">
                        {currentUser?.avatarUrl ? (
                            <img src={fixUrl(currentUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white font-bold text-sm">
                                {(currentUser?.displayName || currentUser?.username)?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-full px-4 py-2.5 sm:py-3 text-slate-500 dark:text-slate-400 text-sm sm:text-[15px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium">
                        What's on your mind?
                    </div>
                </div>
            </div>

            {/* Modal Popup */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm sm:p-4 p-0">
                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 sm:rounded-3xl rounded-none w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                        
                        {/* Mobile Sticky Header */}
                        <div className="sm:hidden sticky top-0 z-[50] bg-white dark:bg-[#1e293b] px-4 py-3 flex-shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Create Post</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden sm:flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#1e293b]">
                            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Create Post</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-[#1e293b]">
                            {/* User Header Section */}
                            <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                                        {currentUser?.avatarUrl ? (
                                            <img src={fixUrl(currentUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white font-bold text-sm">
                                                {(currentUser?.displayName || currentUser?.username)?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowPrivacyMenu(!showPrivacyMenu); }}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors font-semibold text-slate-700 dark:text-slate-300 text-sm"
                                        >
                                            <currentPrivacy.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            {currentPrivacy.label}
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        </button>
                                        
                                        {showPrivacyMenu && (
                                            <>
                                                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-50">
                                                    {privacyOptions.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                setPrivacy(option.value as any);
                                                                setShowPrivacyMenu(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                                                        >
                                                            <option.icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{option.label}</p>
                                                                <p className="text-xs font-semibold text-slate-500">{option.description}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowPrivacyMenu(false)} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Post Input Area */}
                            <div className="px-4 sm:px-6 pb-4">
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    placeholder="What's on your mind?"
                                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 resize-none py-2 text-[16px] sm:text-[18px] leading-relaxed"
                                    style={{ minHeight: TEXTAREA_MIN_HEIGHT, maxHeight: TEXTAREA_MAX_HEIGHT }}
                                    rows={1}
                                    autoFocus
                                />
                            </div>

                            {/* Mention Dropdown */}
                            {showMentions && mentionSuggestions.length > 0 && (
                                <div className="px-4 sm:px-6 pb-4">
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                        {mentionSuggestions.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => handleMentionSelect(user)}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-500 dark:text-white flex-shrink-0">
                                                    {(user.displayName || user.username)[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.displayName || user.username}</p>
                                                    <p className="text-xs text-slate-500 truncate">@{user.username}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {imagePreview && (
                                <div className="px-4 sm:px-6 pb-4">
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 group">
                                        <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-[300px] object-cover" />
                                        <button
                                            onClick={() => { setImage(null); setImagePreview(null); }}
                                            className="absolute top-2 right-2 p-2 bg-slate-900/60 backdrop-blur-sm text-white rounded-full hover:bg-slate-900/80 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#1e293b] flex items-center justify-between gap-4">
                            <label className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 cursor-pointer transition-colors flex-shrink-0 text-blue-500">
                                <ImageIcon className="w-5 h-5" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>

                            <button
                                onClick={handlePost}
                                disabled={(!content.trim() && !image) || loading}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Post
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
