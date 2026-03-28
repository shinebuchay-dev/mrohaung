const pool = require('../utils/prisma');

module.exports = async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // 1. Check environment variable first (faster & bypasses DB if blocked)
        const raw = process.env.ADMIN_USER_IDS || '';
        const admins = raw.split(',').map(s => s.trim()).filter(Boolean);

        if (admins.includes(req.userId)) {
            return next();
        }

        // 2. Fallback to SQL role check (only if not found in env)
        try {
            const [rows] = await pool.execute('SELECT role FROM User WHERE id = ?', [req.userId]);
            if (rows.length > 0) {
                const user = rows[0];
                if (user.role && user.role.toLowerCase() === 'admin') {
                    return next();
                }
            }
        } catch (dbError) {
            console.error('Database role check failed (IP block?):', dbError.message);
            // If DB query fails and user wasn't in env list, we can only deny access
            return res.status(403).json({ message: 'Authorization unavailable (Database connection error)' });
        }

        return res.status(403).json({ message: 'Admin access required' });
    } catch (error) {
        console.error('Fatal in adminMiddleware:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
