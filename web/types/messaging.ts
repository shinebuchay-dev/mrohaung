export interface User {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl: string | null;
}

export interface Message {
    id: string;
    conversationId: string;
    content: string;
    senderId: string;
    imageUrl?: string | null;
    replyToId?: string | null;
    replyToContent?: string | null;
    reactions?: { [emoji: string]: string[] } | null; // emoji -> list of userIds
    sender: User;
    read: boolean;
    createdAt: string;
}

export interface Conversation {
    id: string;
    participants: User[];
    lastMessage: Message | null;
    lastMessageAt: string | null;
    unreadCount: number;
}
