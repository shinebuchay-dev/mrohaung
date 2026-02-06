module.exports = (req, res, next) => {
    const raw = process.env.ADMIN_USER_IDS || '';
    const admins = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    if (!req.userId || !admins.includes(req.userId)) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    next();
};
