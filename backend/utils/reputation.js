const pool = require('./prisma');

/**
 * Update user reputation
 * @param {string} userId - ID of the user to update
 * @param {number} points - Points to add (can be negative)
 */
exports.updateReputation = async (userId, points) => {
    try {
        await pool.execute(
            'UPDATE User SET reputation = reputation + ? WHERE id = ?',
            [points, userId]
        );
    } catch (error) {
        console.error('Failed to update reputation:', error);
    }
};

exports.REPUTATION_POINTS = {
    CREATE_POST: 5,
    RECEIVE_LIKE: 1,
    RECEIVE_COMMENT: 2,
    CREATE_COMMENT: 1,
};
