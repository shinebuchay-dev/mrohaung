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
        const userId = req.userId;
        const { bio, coverOffset, displayName } = req.body;
        let avatarUrl = undefined;
        let coverUrl = undefined;

        console.log('Update Profile Body:', req.body);
        console.log('Update Profile Files:', req.files ? Object.keys(req.files) : 'None');

        if (req.files) {
            if (req.files.avatar) {
                const uploadResult = await uploadFile(req.files.avatar[0].buffer, req.files.avatar[0].originalname, req.files.avatar[0].mimetype, userId, 'avatars');
                avatarUrl = uploadResult.url;
            }
            if (req.files.cover) {
                const uploadResult = await uploadFile(req.files.cover[0].buffer, req.files.cover[0].originalname, req.files.cover[0].mimetype, userId, 'covers');
                coverUrl = uploadResult.url;
            }
        }

        let updateFields = [];
        let params = [];

        if (bio !== undefined) {
            updateFields.push('bio = ?');
            params.push(bio);
        }

        if (displayName) {
            updateFields.push('displayName = ?');
            params.push(displayName);
        }

        if (avatarUrl) {
            updateFields.push('avatarUrl = ?');
            params.push(avatarUrl);
        }

        if (coverUrl) {
            updateFields.push('coverUrl = ?');
            params.push(coverUrl);
        }

        if (coverOffset !== undefined && coverOffset !== '') {
            updateFields.push('coverOffset = ?');
            const numericOffset = parseInt(coverOffset);
            params.push(isNaN(numericOffset) ? 50 : numericOffset);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields provided' });
        }

        // Build query
        const sql = `UPDATE User SET ${updateFields.join(', ')} WHERE id = ?`;
        params.push(userId);

        console.log('Update SQL:', sql);
        console.log('Update Params:', params);

        const [result] = await pool.query(sql, params);
        console.log('Database Result:', result);

        // Fetch and return the updated user
        const [updatedList] = await pool.query('SELECT * FROM User WHERE id = ?', [userId]);
        if (updatedList.length === 0) {
            return res.status(404).json({ message: 'User not found after update' });
        }
        res.json(updatedList[0]);
    } catch (error) {
        console.error('Update Profile Controller Error:', error);
        res.status(500).json({ message: 'Internal server error', details: error.message, stack: error.stack });
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
