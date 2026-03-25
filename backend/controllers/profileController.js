const pool = require('../utils/prisma');
const { uploadFile } = require('../utils/minio');

exports.getProfile = async (req, res) => {
    try {
        const identifier = req.params.id;
        const currentUserId = req.userId;

        const [users] = await pool.query(
            `SELECT u.id, u.username, u.displayName, u.bio, u.avatarUrl, u.coverUrl, u.coverOffset, u.createdAt, u.reputation,
            (SELECT COUNT(*) FROM Post WHERE authorId = u.id) as postCount,
            (SELECT COUNT(*) FROM Friendship WHERE (userId = u.id OR friendId = u.id) AND status = 'accepted') as friendCount
            FROM User u WHERE u.id = ? OR u.username = ?
            LIMIT 1`,
            [identifier, identifier]
        );

        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];

        // Check if current user is blocked by this user
        if (currentUserId && currentUserId !== user.id) {
            const [blocks] = await pool.execute(
                'SELECT 1 FROM BlockedUser WHERE blockerId = ? AND blockedId = ?',
                [user.id, currentUserId]
            );
            if (blocks.length > 0) {
                return res.status(403).json({
                    message: 'You are blocked by this user',
                    isBlocked: true
                });
            }
        }

        // Normalize counts to numbers
        user._count = {
            posts: parseInt(user.postCount || 0),
            friends: parseInt(user.friendCount || 0)
        };
        delete user.postCount;
        delete user.friendCount;

        res.json(user);
    } catch (error) {
        console.error('Error in getProfile:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { bio, coverOffset, displayName } = req.body;
        let avatarUrl = undefined;
        let coverUrl = undefined;

        if (req.files) {
            if (req.files.avatar) {
                const uploadResult = await uploadFile(req.files.avatar[0].buffer, req.files.avatar[0].originalname, req.files.avatar[0].mimetype, req.userId, 'avatars');
                avatarUrl = uploadResult.url;
            }
            if (req.files.cover) {
                const uploadResult = await uploadFile(req.files.cover[0].buffer, req.files.cover[0].originalname, req.files.cover[0].mimetype, req.userId, 'covers');
                coverUrl = uploadResult.url;
            }
        }

        let query = 'UPDATE User SET bio = ?';
        const params = [bio];

        if (displayName) {
            query += ', displayName = ?';
            params.push(displayName);
        }

        if (avatarUrl) {
            query += ', avatarUrl = ?';
            params.push(avatarUrl);
        }

        if (coverUrl) {
            query += ', coverUrl = ?';
            params.push(coverUrl);
        }

        if (coverOffset !== undefined) {
            query += ', coverOffset = ?';
            params.push(parseInt(coverOffset));
        }

        query += ' WHERE id = ?';
        params.push(req.userId);

        await pool.execute(query, params);

        // Fetch updated user to return
        const [updatedUsers] = await pool.execute('SELECT * FROM User WHERE id = ?', [req.userId]);
        res.json(updatedUsers[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json([]);
        }

        const searchTerm = `%${q}%`;
        const [users] = await pool.query(
            `SELECT id, username, email, avatarUrl 
             FROM User 
             WHERE username LIKE ? OR email LIKE ?
             LIMIT 10`,
            [searchTerm, searchTerm]
        );

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.userId;

        // Remove content created by user
        await pool.execute('DELETE FROM `Like` WHERE userId = ?', [userId]);
        await pool.execute('DELETE FROM Comment WHERE userId = ?', [userId]);
        await pool.execute('DELETE FROM StoryView WHERE userId = ?', [userId]);

        // Remove friendships
        await pool.execute('DELETE FROM Friendship WHERE userId = ? OR friendId = ?', [userId, userId]);

        // Remove notifications to/from user
        await pool.execute('DELETE FROM Notification WHERE userId = ? OR fromUserId = ?', [userId, userId]);

        // Remove stories
        await pool.execute('DELETE FROM Story WHERE userId = ?', [userId]);

        // Remove posts (and their related likes/comments)
        const [postRows] = await pool.execute('SELECT id FROM Post WHERE authorId = ?', [userId]);
        for (const row of postRows) {
            await pool.execute('DELETE FROM `Like` WHERE postId = ?', [row.id]);
            await pool.execute('DELETE FROM Comment WHERE postId = ?', [row.id]);
        }
        await pool.execute('DELETE FROM Post WHERE authorId = ?', [userId]);

        // Remove messages sent by user
        await pool.execute('DELETE FROM Message WHERE senderId = ?', [userId]);

        // Remove conversation participation
        await pool.execute('DELETE FROM ConversationParticipant WHERE userId = ?', [userId]);

        // Cleanup empty conversations (no participants)
        await pool.execute(
            'DELETE FROM Conversation WHERE id NOT IN (SELECT DISTINCT conversationId FROM ConversationParticipant)',
            []
        );

        // Finally remove user
        const [result] = await pool.execute('DELETE FROM User WHERE id = ?', [userId]);

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete account' });
    }
};
