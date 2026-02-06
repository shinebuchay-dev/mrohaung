const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadFile } = require('../utils/minio');
const { encrypt, decrypt } = require('../utils/crypto');

// Get user's conversations
const getConversations = async (req, res) => {
    try {
        const userId = req.userId;

        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatarUrl: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1,
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                lastMessageAt: 'desc'
            }
        });

        // Filter out current user from participants and get unread count
        const formattedConversations = await Promise.all(conversations.map(async (conv) => {
            const otherParticipants = conv.participants.filter(p => p.userId !== userId);
            const unreadCount = await prisma.message.count({
                where: {
                    conversationId: conv.id,
                    senderId: { not: userId },
                    read: false
                }
            });

            const lastMessage = conv.messages[0] || null;
            if (lastMessage && lastMessage.content) {
                lastMessage.content = decrypt(lastMessage.content);
            }

            return {
                id: conv.id,
                participants: otherParticipants.map(p => p.user),
                lastMessage: lastMessage,
                lastMessageAt: conv.lastMessageAt,
                unreadCount,
                createdAt: conv.createdAt
            };
        }));

        res.json(formattedConversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

// Get messages in a conversation
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;
        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: {
                conversationId,
                userId
            }
        });

        if (!participant) {
            return res.status(403).json({ error: 'Not authorized to view this conversation' });
        }

        const messages = await prisma.message.findMany({
            where: { conversationId },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: parseInt(skip),
            take: parseInt(limit)
        });

        const decryptedMessages = messages.map(msg => ({
            ...msg,
            content: decrypt(msg.content)
        }));

        res.json(decryptedMessages.reverse());
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// Send a message
const sendMessage = async (req, res) => {
    try {
        const { conversationId, recipientId, content, replyToId, replyToContent } = req.body;
        const senderId = req.userId; // Use senderId from req.userId

        if ((!content || content.trim() === '') && !req.file) {
            return res.status(400).json({ error: 'Message content or image is required' });
        }

        let imageUrl = null;
        if (req.file) {
            try {
                const uploadResult = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
                imageUrl = uploadResult.url;
            } catch (uploadError) {
                console.error('Image upload failed:', uploadError);
                // Continue without image or return error? Let's return error for explicit uploads
                return res.status(500).json({ error: 'Failed to upload image' });
            }
        }

        let conversation;

        // If conversationId provided, use it
        if (conversationId) {
            // Verify user is participant
            const participant = await prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId: senderId
                }
            });

            if (!participant) {
                return res.status(403).json({ error: 'Not authorized to send messages in this conversation' });
            }

            conversation = await prisma.conversation.findUnique({
                where: { id: conversationId }
            });
        } else if (recipientId) {
            // Find existing conversation between these two users
            const existingConv = await prisma.conversation.findFirst({
                where: {
                    AND: [
                        {
                            participants: {
                                some: { userId: senderId }
                            }
                        },
                        {
                            participants: {
                                some: { userId: recipientId }
                            }
                        }
                    ]
                },
                include: {
                    participants: true
                }
            });

            // Check if it's a 2-person conversation
            if (existingConv && existingConv.participants.length === 2) {
                conversation = existingConv;
            } else {
                // Create new conversation
                conversation = await prisma.conversation.create({
                    data: {
                        participants: {
                            create: [
                                { userId: senderId },
                                { userId: recipientId }
                            ]
                        }
                    }
                });
            }
        } else {
            return res.status(400).json({ error: 'Either conversationId or recipientId is required' });
        }

        // Create message with encrypted content
        const message = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: senderId,
                content: content ? encrypt(content.trim()) : '',
                imageUrl,
                replyToId: replyToId || null,
                replyToContent: replyToContent ? encrypt(replyToContent) : null
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
                    }
                }
            }
        });

        // Decrypt for socket emission and response
        const responseMessage = {
            ...message,
            content: content ? content.trim() : '',
            replyToContent: replyToContent || null
        };

        // Update conversation lastMessageAt
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() }
        });

        // Emit real-time message via Socket.io
        const io = req.app.get('io');
        if (io) {
            // Get recipient IDs
            const participants = await prisma.conversationParticipant.findMany({
                where: {
                    conversationId: conversation.id,
                    userId: { not: senderId }
                }
            });

            participants.forEach(participant => {
                io.to(`user:${participant.userId}`).emit('new_message', {
                    conversationId: conversation.id,
                    message: responseMessage
                });
            });
        }

        res.status(201).json(responseMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// Mark messages as read
const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: {
                conversationId,
                userId
            }
        });

        if (!participant) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Mark all unread messages from others as read
        await prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                read: false
            },
            data: { read: true }
        });

        // Emit read receipt via Socket.io
        const io = req.app.get('io');
        if (io) {
            const participants = await prisma.conversationParticipant.findMany({
                where: {
                    conversationId,
                    userId: { not: userId }
                }
            });

            participants.forEach(participant => {
                io.to(`user:${participant.userId}`).emit('messages_read', {
                    conversationId,
                    readBy: userId
                });
            });
        }

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.userId;

        const count = await prisma.message.count({
            where: {
                conversation: {
                    participants: {
                        some: { userId }
                    }
                },
                senderId: { not: userId },
                read: false
            }
        });

        res.json({ count });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
};

// Handle message reaction
const handleReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.userId;

        const message = await prisma.message.findUnique({
            where: { id: messageId }
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        let reactions = message.reactions || {};
        if (typeof reactions === 'string') reactions = JSON.parse(reactions);

        if (!reactions[emoji]) {
            reactions[emoji] = [userId];
        } else {
            const index = reactions[emoji].indexOf(userId);
            if (index > -1) {
                // Remove reaction if already exists
                reactions[emoji].splice(index, 1);
                if (reactions[emoji].length === 0) {
                    delete reactions[emoji];
                }
            } else {
                // Add reaction
                reactions[emoji].push(userId);
            }
        }

        const updatedMessage = await prisma.message.update({
            where: { id: messageId },
            data: { reactions },
            include: {
                sender: {
                    select: { id: true, username: true, avatarUrl: true }
                }
            }
        });

        // Emit reaction update
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${message.conversationId}`).emit('message_reaction', {
                messageId,
                reactions,
                userId
            });
        }

        res.json(updatedMessage);
    } catch (error) {
        console.error('Error handling reaction:', error);
        res.status(500).json({ error: 'Failed to handle reaction' });
    }
};

// Get shared media (images) for a conversation
const getSharedMedia = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;

        // Verify participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId, userId }
        });

        if (!participant) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const media = await prisma.message.findMany({
            where: {
                conversationId,
                imageUrl: { not: null }
            },
            select: {
                id: true,
                imageUrl: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(media);
    } catch (error) {
        console.error('Error fetching shared media:', error);
        res.status(500).json({ error: 'Failed to fetch shared media' });
    }
};

module.exports = {
    getConversations,
    getMessages,
    sendMessage,
    markAsRead,
    getUnreadCount,
    handleReaction,
    getSharedMedia
};
