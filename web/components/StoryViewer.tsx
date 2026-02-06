'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface Story {
    id: string;
    type: string;
    mediaUrl?: string;
    content?: string;
    fontStyle?: string;
    background?: string;
    imageUrl?: string; // Legacy support
    caption?: string;
    viewCount: number;
    hasViewed: boolean;
    expiresAt: string;
    createdAt: string;
}

interface StoryGroup {
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    stories: Story[];
}

interface StoryViewerProps {
    storyGroup: StoryGroup;
    allStoryGroups: StoryGroup[];
    onClose: () => void;
    onStoryChange: (newGroup: StoryGroup) => void;
}

export default function StoryViewer({ storyGroup, allStoryGroups, onClose, onStoryChange }: StoryViewerProps) {
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const currentStory = storyGroup.stories[currentStoryIndex];
    const isOwnStory = currentUser?.id === storyGroup.userId;

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            setCurrentUser(JSON.parse(user));
        }
    }, []);

    useEffect(() => {
        // Mark story as viewed
        if (currentStory && !currentStory.hasViewed) {
            api.post(`/stories/${currentStory.id}/view`).catch(console.error);
        }
    }, [currentStory]);

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + 2; // 5 seconds per story (100 / 2 = 50 intervals * 100ms = 5000ms)
            });
        }, 100);

        return () => clearInterval(interval);
    }, [currentStoryIndex, isPaused]);

    const handleNext = () => {
        if (currentStoryIndex < storyGroup.stories.length - 1) {
            setCurrentStoryIndex(currentStoryIndex + 1);
            setProgress(0);
        } else {
            // Move to next story group
            const currentGroupIndex = allStoryGroups.findIndex(g => g.userId === storyGroup.userId);
            if (currentGroupIndex < allStoryGroups.length - 1) {
                onStoryChange(allStoryGroups[currentGroupIndex + 1]);
                setCurrentStoryIndex(0);
                setProgress(0);
            } else {
                onClose();
            }
        }
    };

    const handlePrevious = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(currentStoryIndex - 1);
            setProgress(0);
        } else {
            // Move to previous story group
            const currentGroupIndex = allStoryGroups.findIndex(g => g.userId === storyGroup.userId);
            if (currentGroupIndex > 0) {
                const prevGroup = allStoryGroups[currentGroupIndex - 1];
                onStoryChange(prevGroup);
                setCurrentStoryIndex(prevGroup.stories.length - 1);
                setProgress(0);
            }
        }
    };

    const handleDelete = async () => {
        if (!isOwnStory) return;

        try {
            await api.delete(`/stories/${currentStory.id}`);
            // Remove story from local state
            const updatedStories = storyGroup.stories.filter(s => s.id !== currentStory.id);
            if (updatedStories.length === 0) {
                onClose();
            } else {
                storyGroup.stories = updatedStories;
                if (currentStoryIndex >= updatedStories.length) {
                    setCurrentStoryIndex(updatedStories.length - 1);
                }
            }
        } catch (error) {
            console.error('Failed to delete story:', error);
        }
    };

    const getTimeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
                {storyGroup.stories.map((_, index) => (
                    <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-100"
                            style={{
                                width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
                <div className="flex items-center gap-3">
                    {((isOwnStory ? currentUser.avatarUrl : storyGroup.avatarUrl)) ? (
                        <img
                            src={isOwnStory ? currentUser.avatarUrl : storyGroup.avatarUrl}
                            alt={storyGroup.displayName || storyGroup.username || ''}
                            className="w-10 h-10 rounded-full border-2 border-white object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
                            {(storyGroup.displayName || storyGroup.username)?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <div>
                        <p className="text-white font-semibold">{storyGroup.displayName || storyGroup.username}</p>
                        <p className="text-white/70 text-sm">{getTimeAgo(currentStory.createdAt)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isOwnStory && (
                        <>
                            <button
                                onClick={handleDelete}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Trash2 className="w-5 h-5 text-white" />
                            </button>
                            <div className="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full">
                                <Eye className="w-4 h-4 text-white" />
                                <span className="text-white text-sm">{currentStory.viewCount}</span>
                            </div>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>

            {/* Story Content */}
            <div
                className="relative w-full h-full flex items-center justify-center"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                {currentStory.type === 'text' ? (
                    <div className={`w-full h-full flex items-center justify-center p-12 ${currentStory.background || 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                        <p className={`text-white text-4xl font-bold text-center ${currentStory.fontStyle || 'font-sans'}`}>
                            {currentStory.content}
                        </p>
                    </div>
                ) : (
                    <img
                        src={currentStory.mediaUrl || currentStory.imageUrl}
                        alt="Story"
                        className="max-w-full max-h-full object-contain"
                    />
                )}

                {/* Navigation Areas */}
                <button
                    onClick={handlePrevious}
                    className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-4 hover:bg-gradient-to-r hover:from-black/20 transition-colors group"
                >
                    <ChevronLeft className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button
                    onClick={handleNext}
                    className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-4 hover:bg-gradient-to-l hover:from-black/20 transition-colors group"
                >
                    <ChevronRight className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            {/* Caption for media stories */}
            {currentStory.type !== 'text' && currentStory.content && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-center text-lg">{currentStory.content}</p>
                </div>
            )}
        </div>
    );
}
