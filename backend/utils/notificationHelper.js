const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create and send a notification
 * @param {Object} io - Socket.io instance
 * @param {String} userId - User ID to send notification to
 * @param {Object} notificationData - Notification data
 */
async function sendNotification(io, userId, notificationData) {
    try {
        // Create notification in database
        const notification = await prisma.notification.create({
            data: {
                type: notificationData.type,
                message: notificationData.message,
                userId: userId,
                fromUserId: notificationData.fromUserId,
                postId: notificationData.postId || null,
            },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // Emit real-time notification via Socket.io
        if (io) {
            io.to(`user:${userId}`).emit('notification', {
                id: notification.id,
                type: notification.type,
                message: notification.message,
                from: notification.fromUser,
                createdAt: notification.createdAt,
                read: notification.read,
            });
        }

        return notification;
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
}

/**
 * Create notification helper
 * @param {String} type - Notification type (like, comment, friend_request, friend_accept)
 * @param {String} fromUserId - User who triggered the notification
 * @param {String} toUserId - User to receive the notification
 * @param {String} message - Notification message
 * @param {String} postId - Optional post ID
 */
async function createNotification(type, fromUserId, toUserId, message, postId = null) {
    try {
        // Don't create notification if user is notifying themselves
        if (fromUserId === toUserId) {
            return null;
        }

        const notification = await prisma.notification.create({
            data: {
                type,
                message,
                userId: toUserId,
                fromUserId,
                postId,
            },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

module.exports = {
    sendNotification,
    createNotification,
};
