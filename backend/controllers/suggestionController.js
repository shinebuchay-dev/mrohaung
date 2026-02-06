const pool = require('../utils/prisma');

// Get friend suggestions based on mutual friends
exports.getFriendSuggestions = async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 5;

        // Get users who are:
        // 1. Not the current user
        // 2. Not already friends with current user
        // 3. Not pending friend requests
        // 4. Have mutual friends with current user
        const [suggestions] = await pool.execute(
            `SELECT DISTINCT u.id, u.username, u.avatarUrl, u.bio,
             (SELECT COUNT(DISTINCT f2.friendId)
              FROM Friendship f1
              JOIN Friendship f2 ON f1.friendId = f2.userId
              WHERE f1.userId = ? 
              AND f1.status = 'accepted'
              AND f2.friendId = u.id
              AND f2.status = 'accepted'
              AND f2.userId != ?
             ) as mutualFriendsCount
             FROM User u
             WHERE u.id != ?
             AND u.id NOT IN (
                SELECT friendId FROM Friendship 
                WHERE userId = ? AND status IN ('accepted', 'pending')
             )
             AND u.id NOT IN (
                SELECT userId FROM Friendship 
                WHERE friendId = ? AND status IN ('accepted', 'pending')
             )
             AND EXISTS (
                SELECT 1 FROM Friendship f1
                JOIN Friendship f2 ON f1.friendId = f2.userId
                WHERE f1.userId = ? 
                AND f1.status = 'accepted'
                AND f2.friendId = u.id
                AND f2.status = 'accepted'
                AND f2.userId != ?
             )
             ORDER BY mutualFriendsCount DESC, RAND()
             LIMIT ?`,
            [userId, userId, userId, userId, userId, userId, userId, limit]
        );

        // Get mutual friends for each suggestion
        const suggestionsWithMutuals = await Promise.all(suggestions.map(async (suggestion) => {
            const [mutualFriends] = await pool.execute(
                `SELECT DISTINCT u.id, u.username, u.avatarUrl
                 FROM User u
                 JOIN Friendship f1 ON u.id = f1.friendId
                 JOIN Friendship f2 ON u.id = f2.userId
                 WHERE f1.userId = ?
                 AND f1.status = 'accepted'
                 AND f2.friendId = ?
                 AND f2.status = 'accepted'
                 LIMIT 3`,
                [userId, suggestion.id]
            );

            return {
                ...suggestion,
                mutualFriendsCount: parseInt(suggestion.mutualFriendsCount || 0),
                mutualFriends: mutualFriends
            };
        }));

        res.json(suggestionsWithMutuals);
    } catch (error) {
        console.error('Error fetching friend suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch friend suggestions' });
    }
};

// Get random user suggestions (fallback when no mutual friends)
exports.getRandomSuggestions = async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 5;

        const [suggestions] = await pool.execute(
            `SELECT u.id, u.username, u.avatarUrl, u.bio,
             (SELECT COUNT(*) FROM Friendship WHERE userId = u.id AND status = 'accepted') as friendsCount
             FROM User u
             WHERE u.id != ?
             AND u.id NOT IN (
                SELECT friendId FROM Friendship 
                WHERE userId = ? AND status IN ('accepted', 'pending')
             )
             AND u.id NOT IN (
                SELECT userId FROM Friendship 
                WHERE friendId = ? AND status IN ('accepted', 'pending')
             )
             ORDER BY RAND()
             LIMIT ?`,
            [userId, userId, userId, limit]
        );

        res.json(suggestions.map(s => ({
            ...s,
            friendsCount: parseInt(s.friendsCount || 0),
            mutualFriendsCount: 0,
            mutualFriends: []
        })));
    } catch (error) {
        console.error('Error fetching random suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
};

// Dismiss a suggestion (store in localStorage on frontend)
exports.dismissSuggestion = async (req, res) => {
    try {
        // This is handled on frontend via localStorage
        // Backend just returns success
        res.json({ success: true });
    } catch (error) {
        console.error('Error dismissing suggestion:', error);
        res.status(500).json({ error: 'Failed to dismiss suggestion' });
    }
};
