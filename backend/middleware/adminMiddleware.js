const pool = require('../utils/prisma');

module.exports = async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const [rows] = await pool.execute('SELECT role FROM User WHERE id = ?', [req.userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = rows[0];

        // Check if role is admin (case-insensitive check for safety)
        if (user.role && user.role.toLowerCase() === 'admin') {
            return next();
        }

        // Fallback to environment variable check for initial setup
        const raw = process.env.ADMIN_USER_IDS || '';
        const admins = raw.split(',').map(s => s.trim()).filter(Boolean);

        if (admins.includes(req.userId)) {
            return next();
        }

        return res.status(403).json({ message: 'Admin access required' });
    } catch (error) {
        console.error('Error in adminMiddleware:', error);
        res.status(500).json({ message: 'Internal server error during authorization' });
    }
};
