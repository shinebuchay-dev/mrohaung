'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import CreateStory from './CreateStory';
import StoryViewer from './StoryViewer';
import { fixUrl } from '@/lib/utils';

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

export default function StoriesBar() {
    const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
    const [showCreateStory, setShowCreateStory] = useState(false);
    const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const syncUser = () => {
            const user = localStorage.getItem('user');
            if (user) {
                setCurrentUser(JSON.parse(user));
            }
        };

        syncUser();
        fetchStories();

        window.addEventListener('userUpdated', syncUser);
        return () => window.removeEventListener('userUpdated', syncUser);
    }, []);

    const fetchStories = async () => {
        try {
            const response = await api.get('/stories');
            setStoryGroups(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch stories:', error);
        }
    };

    const handleStoryCreated = () => {
        fetchStories();
    };

    const userHasStory = storyGroups.find(group => group.userId === currentUser?.id);

    return (
        <>
            <div className="mb-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex gap-5 overflow-x-auto pb-5 scrollbar-hide px-0.5">
                    {/* Create Story Button */}
                    <button
                        onClick={() => setShowCreateStory(true)}
                        className="flex-shrink-0 flex flex-col items-center gap-2 group transition-all"
                    >
                        <div className="relative">
                            <div className="w-[60px] h-[60px] rounded-full p-[2px] bg-slate-100 dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 group-hover:ring-blue-500/50 transition-all duration-300">
                                {currentUser?.avatarUrl ? (
                                    <img
                                        src={fixUrl(currentUser.avatarUrl)}
                                        alt="Your story"
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-slate-200 dark:bg-[#334155] flex items-center justify-center">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold text-lg">
                                            {(currentUser?.displayName || currentUser?.username)?.[0]?.toUpperCase() || '+'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0f172a] shadow-lg">
                                <Plus className="w-3.5 h-3.5 text-white stroke-[3px]" />
                            </div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors tracking-tight">
                            {userHasStory ? 'Add Story' : 'Your Story'}
                        </span>
                    </button>

                    {/* Story Groups */}
                    {storyGroups.map((group) => (
                        <button
                            key={group.userId}
                            onClick={() => setSelectedStoryGroup(group)}
                            className="flex-shrink-0 flex flex-col items-center gap-2 group transition-all"
                        >
                            <div className={`w-[60px] h-[60px] rounded-full p-[2px] transition-all duration-300 ${group.stories.some(s => !s.hasViewed)
                                ? 'bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 p-[3px] scale-105 shadow-lg shadow-blue-500/10'
                                : 'bg-slate-200 dark:bg-white/10'
                                }`}>
                                <div className="w-full h-full rounded-full p-[2px] bg-white dark:bg-[#0f172a]">
                                    {((group.userId === currentUser?.id ? currentUser.avatarUrl : group.avatarUrl)) ? (
                                        <img
                                            src={fixUrl(group.userId === currentUser?.id ? currentUser.avatarUrl : group.avatarUrl)}
                                            alt={group.displayName || group.username || ''}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                                            <span className="text-slate-600 dark:text-slate-400 font-bold text-xs uppercase">
                                                {(group.displayName || group.username)?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className={`text-[11px] font-bold transition-colors tracking-tight max-w-[64px] truncate ${group.stories.some(s => !s.hasViewed)
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                }`}>
                                {group.userId === currentUser?.id ? 'You' : (group.displayName || group.username)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {showCreateStory && (
                <CreateStory
                    onClose={() => setShowCreateStory(false)}
                    onStoryCreated={handleStoryCreated}
                />
            )}

            {selectedStoryGroup && (
                <StoryViewer
                    storyGroup={selectedStoryGroup}
                    allStoryGroups={storyGroups}
                    onClose={() => setSelectedStoryGroup(null)}
                    onStoryChange={(newGroup) => setSelectedStoryGroup(newGroup)}
                />
            )}
        </>
    );
}
