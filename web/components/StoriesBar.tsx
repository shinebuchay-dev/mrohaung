'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import CreateStory from './CreateStory';
import StoryViewer from './StoryViewer';

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
            setStoryGroups(response.data);
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
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-[#334155] rounded-2xl p-4 mb-6">
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {/* Create Story Button */}
                    <button
                        onClick={() => setShowCreateStory(true)}
                        className="flex-shrink-0 flex flex-col items-center gap-2 group"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                                {currentUser?.avatarUrl ? (
                                    <img
                                        src={currentUser.avatarUrl}
                                        alt="Your story"
                                        className="w-14 h-14 rounded-full object-cover border border-[#1e293b]"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-[#334155] flex items-center justify-center border border-[#1e293b]">
                                        <span className="text-white font-bold text-lg">
                                            {(currentUser?.displayName || currentUser?.username)?.[0]?.toUpperCase() || '+'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-[#1e293b]">
                                <Plus className="w-3 h-3 text-white" />
                            </div>
                        </div>
                        <span className="text-xs text-[#94a3b8] group-hover:text-white transition-colors">
                            {userHasStory ? 'Add Story' : 'Your Story'}
                        </span>
                    </button>

                    {/* Story Groups */}
                    {storyGroups.map((group) => (
                        <button
                            key={group.userId}
                            onClick={() => setSelectedStoryGroup(group)}
                            className="flex-shrink-0 flex flex-col items-center gap-2 group"
                        >
                            <div className={`w-16 h-16 rounded-full p-0.5 ${group.stories.some(s => !s.hasViewed)
                                ? 'bg-gradient-to-tr from-pink-500 via-purple-500 to-blue-500'
                                : 'bg-[#334155]'
                                }`}>
                                {((group.userId === currentUser?.id ? currentUser.avatarUrl : group.avatarUrl)) ? (
                                    <img
                                        src={group.userId === currentUser?.id ? currentUser.avatarUrl : group.avatarUrl}
                                        alt={group.displayName || group.username || ''}
                                        className="w-full h-full rounded-full object-cover border-2 border-[#1e293b]"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border-2 border-[#1e293b] flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">
                                            {(group.displayName || group.username)?.[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-[#94a3b8] group-hover:text-white transition-colors max-w-[64px] truncate">
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
