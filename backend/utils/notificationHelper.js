const pool = require('./prisma');
const { v4: uuidv4 } = require('uuid');

/**
 * Create and send a notification
 * @param {Object} io - Socket.io instance
 * @param {String} userId - User ID to send notification to
 * @param {Object} notificationData - Notification data
 */
async function sendNotification(io, userId, notificationData) {
    try {
        const id = uuidv4();
        // Create notification in database
        await pool.execute(
            'INSERT INTO Notification (id, type, message, userId, fromUserId, postId) VALUES (?, ?, ?, ?, ?, ?)',
            [
                id,
                notificationData.type,
                notificationData.message,
                userId,
                notificationData.fromUserId,
                notificationData.postId || null,
            ]
        );

        // Fetch user info for real-time emission
        const [users] = await pool.execute(
            'SELECT id, username, displayName, avatarUrl FROM User WHERE id = ?',
            [notificationData.fromUserId]
        );
        const fromUser = users[0];

        // Emit real-time notification via Socket.io
        if (io && fromUser) {
            io.to(`user:${userId}`).emit('notification', {
                id: id,
                type: notificationData.type,
                message: notificationData.message,
                from: {
                    id: fromUser.id,
                    username: fromUser.username,
                    displayName: fromUser.displayName,
                    avatarUrl: fromUser.avatarUrl
                },
                createdAt: new Date(),
                read: false,
            });
        }

        return { id, ...notificationData, fromUser };
    } catch (error) {
        console.error('Error sending notification:', error);
        console.error('Notification data:', notificationData);
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

        const id = uuidv4();
        await pool.execute(
            'INSERT INTO Notification (id, type, message, userId, fromUserId, postId) VALUES (?, ?, ?, ?, ?, ?)',
            [id, type, message, toUserId, fromUserId, postId]
        );

        return { id, type, message, userId: toUserId, fromUserId, postId };
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

module.exports = {
    sendNotification,
    createNotification,
};
