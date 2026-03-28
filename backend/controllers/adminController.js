const pool = require('../utils/prisma');
const { decrypt } = require('../utils/crypto');
const { sendNotification } = require('../utils/notificationHelper');

const parsePagination = (req) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};

exports.getOverview = async (req, res) => {
    try {
        const fetchCount = async (sql) => {
            try {
                const [rows] = await pool.execute(sql);
                return parseInt(rows[0]?.count || 0);
            } catch (e) {
                console.error(`Overview Query Error [${sql.slice(0, 30)}...]:`, e.message);
                return 0;
            }
        };

        // Fetch counts for all main tables safely
        const [
            users, posts, comments, stories, conversations, notifications, pendingVerifications, pendingReports
        ] = await Promise.all([
            fetchCount('SELECT COUNT(*) as count FROM User'),
            fetchCount('SELECT COUNT(*) as count FROM Post'),
            fetchCount('SELECT COUNT(*) as count FROM Comment'),
            fetchCount('SELECT COUNT(*) as count FROM Story'),
            fetchCount('SELECT COUNT(DISTINCT conversationId) as count FROM Message'),
            fetchCount('SELECT COUNT(*) as count FROM Notification'),
            fetchCount('SELECT COUNT(*) as count FROM VerificationRequest WHERE status = "pending"'),
            fetchCount('SELECT COUNT(*) as count FROM Report WHERE status = "pending"')
        ]);

        // Active today query is complex, wrap separately
        let activeToday = 0;
        try {
            const [rows] = await pool.execute(`
                SELECT COUNT(DISTINCT userId) as count FROM (
                    SELECT authorId as userId FROM Post WHERE createdAt > NOW() - INTERVAL 1 DAY
                    UNION ALL
                    SELECT userId FROM Story WHERE createdAt > NOW() - INTERVAL 1 DAY
                    UNION ALL
                    SELECT senderId as userId FROM Message WHERE createdAt > NOW() - INTERVAL 1 DAY
                    UNION ALL
                    SELECT userId FROM Comment WHERE createdAt > NOW() - INTERVAL 1 DAY
                    UNION ALL
                    SELECT authorId as userId FROM ShortVideo WHERE createdAt > NOW() - INTERVAL 1 DAY
                    UNION ALL
                    SELECT userId FROM \`Like\` WHERE id IS NOT NULL -- Likes don't always have createdAt, use ID presence
                    UNION ALL
                    SELECT userId FROM StoryView WHERE viewedAt > NOW() - INTERVAL 1 DAY
                ) as ActiveUsers
            `);
            activeToday = parseInt(rows[0]?.count || 0);
        } catch (e) {
            console.error('Active User Query Failed:', e.message);
        }

        // Fetch recent reports (limit 10)
        let recentReports = [];
        try {
            const [reportRows] = await pool.execute(`
                SELECT r.*, u.username as reporterUsername, u.avatarUrl as reporterAvatar 
                FROM Report r 
                JOIN User u ON r.reporterId = u.id 
                ORDER BY r.createdAt DESC 
                LIMIT 10
            `);
            recentReports = reportRows;
        } catch (e) {
            console.error('Recent Reports Query Failed:', e.message);
        }

        res.json({
            counts: {
                users,
                posts,
                comments,
                stories,
                conversations,
                notifications,
                pendingVerifications,
                pendingReports,
                activeToday
            },
            recentReports
        });
    } catch (error) {
        console.error('Fatal Overview Error:', error);
        // Last line of defense: Return zeros instead of 500
        res.json({
            counts: {
                users: 0, posts: 0, comments: 0, stories: 0, conversations: 0, notifications: 0, pendingVerifications: 0, pendingReports: 0, activeToday: 0
            }
        });
    }
};

exports.listUsers = async (req, res) => {
    try {
        const { limit, offset, page } = parsePagination(req);
        const q = (req.query.q || '').toString().trim();

        let users;
        let total;

        if (q) {
            const like = `%${q}%`;
            const [rows] = await pool.query(
                'SELECT id, username, email, avatarUrl, createdAt FROM User WHERE username LIKE ? OR email LIKE ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
                [like, like, limit, offset]
            );
            users = rows;

            const [[countRow]] = await pool.execute(
                'SELECT COUNT(*) as count FROM User WHERE username LIKE ? OR email LIKE ?',
                [like, like]
            );
            total = parseInt(countRow.count || 0);
        } else {
            const [rows] = await pool.query(
                'SELECT id, username, email, avatarUrl, createdAt FROM User ORDER BY createdAt DESC LIMIT ? OFFSET ?',
                [limit, offset]
            );
            users = rows;

            const [[countRow]] = await pool.execute('SELECT COUNT(*) as count FROM User');
            total = parseInt(countRow.count || 0);
        }

        res.json({ users, page, limit, total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to load users' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId === req.userId) {
            return res.status(400).json({ message: 'You cannot delete yourself' });
        }

        const [result] = await pool.execute('DELETE FROM User WHERE id = ?', [userId]);
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};

exports.listPosts = async (req, res) => {
    try {
        const { limit, offset, page } = parsePagination(req);

        const [posts] = await pool.query(
            `SELECT p.id, p.content, p.imageUrl, p.privacy, p.authorId, p.createdAt, u.username as authorUsername
             FROM Post p
             JOIN User u ON p.authorId = u.id
             ORDER BY p.createdAt DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[countRow]] = await pool.execute('SELECT COUNT(*) as count FROM Post');
        const total = parseInt(countRow.count || 0);

        res.json({ posts, page, limit, total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to load posts' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;

        await pool.execute('DELETE FROM `Like` WHERE postId = ?', [postId]);
        await pool.execute('DELETE FROM Comment WHERE postId = ?', [postId]);

        const [result] = await pool.execute('DELETE FROM Post WHERE id = ?', [postId]);
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete post' });
    }
};

exports.listStories = async (req, res) => {
    try {
        const { limit, offset, page } = parsePagination(req);

        const [stories] = await pool.query(
            `SELECT s.id, s.userId, s.imageUrl, s.caption, s.expiresAt, s.createdAt, u.username
             FROM Story s
             JOIN User u ON s.userId = u.id
             ORDER BY s.createdAt DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[countRow]] = await pool.execute('SELECT COUNT(*) as count FROM Story');
        const total = parseInt(countRow.count || 0);

        res.json({ stories, page, limit, total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to load stories' });
    }
};

exports.deleteStory = async (req, res) => {
    try {
        const { storyId } = req.params;

        await pool.execute('DELETE FROM StoryView WHERE storyId = ?', [storyId]);

        const [result] = await pool.execute('DELETE FROM Story WHERE id = ?', [storyId]);
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Story not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete story' });
    }
};

exports.listComments = async (req, res) => {
    try {
        const { limit, offset, page } = parsePagination(req);

        const [comments] = await pool.query(
            `SELECT c.id, c.content, c.postId, c.userId, c.createdAt, u.username
             FROM Comment c
             JOIN User u ON c.userId = u.id
             ORDER BY c.createdAt DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[countRow]] = await pool.execute('SELECT COUNT(*) as count FROM Comment');
        const total = parseInt(countRow.count || 0);

        res.json({ comments, page, limit, total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to load comments' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const [result] = await pool.execute('DELETE FROM Comment WHERE id = ?', [commentId]);
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete comment' });
    }
};

exports.listMessages = async (req, res) => {
    try {
        const { limit, offset, page } = parsePagination(req);

        const [messages] = await pool.query(
            `SELECT m.id, m.content, m.imageUrl, m.senderId, m.conversationId, m.createdAt, m.read, u.username as senderUsername
             FROM Message m
             JOIN User u ON m.senderId = u.id
             ORDER BY m.createdAt DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[countRow]] = await pool.execute('SELECT COUNT(*) as count FROM Message');
        const total = parseInt(countRow.count || 0);

        // Decrypt messages
        const decryptedMessages = messages.map(msg => ({
            ...msg,
            content: decrypt(msg.content)
        }));

        res.json({ messages: decryptedMessages, page, limit, total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to load messages' });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        const [result] = await pool.execute('DELETE FROM Message WHERE id = ?', [messageId]);
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Message not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete message' });
    }
};

exports.listNotifications = async (req, res) => {
    try {
        const { limit, offset, page } = parsePagination(req);

        // Fetch notifications with usernames for to/from users
        const [notifications] = await pool.query(
            `SELECT n.id, n.type, n.userId as toUserId, u1.username as toUsername, 
                    n.fromUserId, u2.username as fromUsername, n.read, n.message, n.createdAt
             FROM Notification n
             JOIN User u1 ON n.userId = u1.id
             LEFT JOIN User u2 ON n.fromUserId = u2.id
             ORDER BY n.createdAt DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        ).catch(e => {
            console.error('listNotifications Query Failed:', e.message);
            return [[]]; // Return empty array
        });

        let total = 0;
        try {
            const [[countRow]] = await pool.execute('SELECT COUNT(*) as count FROM Notification');
            total = parseInt(countRow.count || 0);
        } catch (e) {
            console.error('listNotifications Count Failed:', e.message);
        }

        res.json({ notifications: notifications || [], page, limit, total });
    } catch (error) {
        console.error('Fatal listNotifications Error:', error);
        res.json({ notifications: [], page: 1, limit: 20, total: 0 });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const [result] = await pool.execute('DELETE FROM Notification WHERE id = ?', [notificationId]);
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
};

exports.listVerificationRequests = async (req, res) => {
    try {
        const { limit, offset, page } = parsePagination(req);
        
        const [requests] = await pool.query(
            `SELECT vr.*, u.username, u.displayName, u.avatarUrl
             FROM VerificationRequest vr
             JOIN User u ON vr.userId = u.id
             ORDER BY vr.createdAt DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        ).catch(e => {
            console.error('listVerificationRequests Query Failed:', e.message);
            return [[]];
        });

        let total = 0;
        try {
            const [[countRow]] = await pool.execute('SELECT COUNT(*) as count FROM VerificationRequest');
            total = parseInt(countRow.count || 0);
        } catch (e) {
            console.error('listVerificationRequests Count Failed:', e.message);
        }

        res.json({ requests: requests || [], page, limit, total });
    } catch (error) {
        console.error('Fatal listVerificationRequests Error:', error);
        res.json({ requests: [], page: 1, limit: 20, total: 0 });
    }
};

exports.handleVerificationAction = async (req, res) => {
    try {
        const { requestId, action } = req.body;

        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action type' });
        }

        const [requests] = await pool.execute('SELECT userId FROM VerificationRequest WHERE id = ?', [requestId]);
        const request = requests[0];
        
        if (!request) {
            return res.status(404).json({ message: 'Verification request not found' });
        }

        const userId = request.userId;

        // Update the request status
        await pool.execute('UPDATE VerificationRequest SET status = ? WHERE id = ?', [action, requestId]);

        if (action === 'approved') {
            // 1. Update User table
            await pool.execute('UPDATE User SET isVerified = 1 WHERE id = ?', [userId]);
            
            // 2. Award verification badge if not already exists
            const [existingBadges] = await pool.execute(
                'SELECT id FROM Badge WHERE userId = ? AND type = "royal_gold"', 
                [userId]
            );
            
            if (existingBadges.length === 0) {
                const badgeId = require('crypto').randomUUID();
                await pool.execute(
                    'INSERT INTO Badge (id, userId, type, awardedAt) VALUES (?, ?, "royal_gold", NOW())',
                    [badgeId, userId]
                );
            }
        }

        // Send notification to the user
        const io = req.app.get('io');
        const msg = action === 'approved' 
            ? 'Congratulations! Your account has been verified. You now have the Royal Gold badge.' 
            : 'Your verification request was reviewed and rejected at this time.';
        
        try {
            await sendNotification(io, userId, {
                type: 'verification',
                message: msg,
                fromUserId: req.userId
            });
        } catch (notifyError) {
            console.error('Failed to send verification notification:', notifyError);
            // Don't fail the whole request just because notification failed
        }

        res.json({ success: true, action, userId });
    } catch (error) {
        console.error('Verify Action Error:', error);
        res.status(500).json({ message: 'Internal server error during verification' });
    }
};
