const pool = require('../utils/prisma');

// Get user's notifications
const getNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [notifications] = await pool.execute(
            `SELECT n.id, n.type, n.message, n.read, n.createdAt, n.postId,
                    u.id as fromUserId, u.username as fromUsername, u.displayName as fromDisplayName, u.avatarUrl as fromAvatarUrl,
                    p.id as postIdRef, p.content as postContent
             FROM Notification n
             JOIN User u ON n.fromUserId = u.id
             LEFT JOIN Post p ON n.postId = p.id
             WHERE n.userId = ?
             ORDER BY n.createdAt DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        const formattedNotifications = notifications.map(n => ({
            id: n.id,
            type: n.type,
            message: n.message,
            read: !!n.read,
            createdAt: n.createdAt,
            from: {
                id: n.fromUserId,
                username: n.fromUsername,
                displayName: n.fromDisplayName,
                avatarUrl: n.fromAvatarUrl
            },
            post: n.postIdRef ? { id: n.postIdRef, content: n.postContent } : null
        }));

        const [[countResult]] = await pool.execute(
            'SELECT COUNT(*) as cnt FROM Notification WHERE userId = ? AND `read` = 0',
            [userId]
        );
        const unreadCount = parseInt(countResult.cnt || 0);

        res.json({
            notifications: formattedNotifications,
            unreadCount,
            page,
            totalPages: Math.max(1, Math.ceil(unreadCount / limit)),
        });
    } catch (error) {
        console.error('Error fetching notifications (Detailed):', {
            message: error.message,
            code: error.code,
            sql: error.sql,
            stack: error.stack
        });
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// Mark single notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const [result] = await pool.execute(
            'UPDATE Notification SET `read` = 1 WHERE id = ? AND userId = ?',
            [id, userId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.userId;

        await pool.execute(
            'UPDATE Notification SET `read` = 1 WHERE userId = ? AND `read` = 0',
            [userId]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};

// Delete a notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const [result] = await pool.execute(
            'DELETE FROM Notification WHERE id = ? AND userId = ?',
            [id, userId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};

// Get unread count
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.userId;

        const [[result]] = await pool.execute(
            'SELECT COUNT(*) as cnt FROM Notification WHERE userId = ? AND `read` = 0',
            [userId]
        );

        res.json({ count: parseInt(result.cnt || 0) });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
};
