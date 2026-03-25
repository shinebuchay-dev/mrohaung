const pool = require('../utils/prisma');

const verificationMiddleware = async (req, res, next) => {
    try {
        const [users] = await pool.execute(
            'SELECT isVerified FROM User WHERE id = ?',
            [req.userId]
        );

        const user = users[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        /* 
        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Email verification required',
                needsVerification: true
            });
        }
        */

        next();
    } catch (error) {
        console.error('Verification Middleware Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = verificationMiddleware;
