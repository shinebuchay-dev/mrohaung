const pool = require('../utils/prisma');
const { v4: uuidv4 } = require('uuid');

// Block a user
exports.blockUser = async (req, res) => {
    try {
        const blockerId = req.userId;
        const { blockedId } = req.params;

        if (blockerId === blockedId) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }

        // Check if already blocked
        const [existing] = await pool.execute(
            'SELECT * FROM BlockedUser WHERE blockerId = ? AND blockedId = ?',
            [blockerId, blockedId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already blocked' });
        }

        const blockId = uuidv4();
        await pool.execute(
            'INSERT INTO BlockedUser (id, blockerId, blockedId) VALUES (?, ?, ?)',
            [blockId, blockerId, blockedId]
        );

        // Remove friendship if exists
        await pool.execute(
            'DELETE FROM Friendship WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)',
            [blockerId, blockedId, blockedId, blockerId]
        );

        res.json({ success: true, message: 'User blocked successfully' });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
};

// Unblock a user
exports.unblockUser = async (req, res) => {
    try {
        const blockerId = req.userId;
        const { blockedId } = req.params;

        await pool.execute(
            'DELETE FROM BlockedUser WHERE blockerId = ? AND blockedId = ?',
            [blockerId, blockedId]
        );

        res.json({ success: true, message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ error: 'Failed to unblock user' });
    }
};

// Get blocked users list
exports.getBlockedUsers = async (req, res) => {
    try {
        const userId = req.userId;

        const [blockedUsers] = await pool.execute(
            `SELECT u.id, u.username, u.avatarUrl, u.bio, bu.createdAt as blockedAt
             FROM BlockedUser bu
             JOIN User u ON bu.blockedId = u.id
             WHERE bu.blockerId = ?
             ORDER BY bu.createdAt DESC`,
            [userId]
        );

        res.json(blockedUsers);
    } catch (error) {
        console.error('Error fetching blocked users:', error);
        res.status(500).json({ error: 'Failed to fetch blocked users' });
    }
};

// Check if user is blocked
exports.checkBlocked = async (req, res) => {
    try {
        const userId = req.userId;
        const { targetUserId } = req.params;

        const [blocked] = await pool.execute(
            'SELECT * FROM BlockedUser WHERE (blockerId = ? AND blockedId = ?) OR (blockerId = ? AND blockedId = ?)',
            [userId, targetUserId, targetUserId, userId]
        );

        res.json({
            isBlocked: blocked.length > 0,
            blockedByMe: blocked.length > 0 && blocked[0].blockerId === userId,
            blockedByThem: blocked.length > 0 && blocked[0].blockerId === targetUserId
        });
    } catch (error) {
        console.error('Error checking block status:', error);
        res.status(500).json({ error: 'Failed to check block status' });
    }
};

// Update account privacy
exports.updatePrivacy = async (req, res) => {
    try {
        const userId = req.userId;
        const { isPrivate } = req.body;

        await pool.execute(
            'UPDATE User SET isPrivate = ? WHERE id = ?',
            [isPrivate, userId]
        );

        res.json({ success: true, isPrivate });
    } catch (error) {
        console.error('Error updating privacy:', error);
        res.status(500).json({ error: 'Failed to update privacy settings' });
    }
};

// Get privacy settings
exports.getPrivacy = async (req, res) => {
    try {
        const userId = req.userId;

        const [users] = await pool.execute(
            'SELECT isPrivate FROM User WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ isPrivate: users[0].isPrivate === 1 });
    } catch (error) {
        console.error('Error fetching privacy settings:', error);
        res.status(500).json({ error: 'Failed to fetch privacy settings' });
    }
};
