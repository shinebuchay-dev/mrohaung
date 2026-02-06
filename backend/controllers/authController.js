const pool = require('../utils/prisma'); // now returns a mysql2 pool
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const slugify = (input) => {
    const raw = (input || '').toString().trim();
    if (!raw) return '';
    const noDiacritics = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const ascii = noDiacritics.replace(/[^a-zA-Z0-9\s]/g, ' ');
    const compact = ascii.trim().replace(/\s+/g, '');
    return compact.toLowerCase();
};

const generateUsername = async (displayName, email) => {
    let base = slugify(displayName);

    if (!base) {
        const emailPrefix = (email || '').split('@')[0] || '';
        base = slugify(emailPrefix);
    }

    if (!base) {
        base = 'user';
    }

    // Ensure username starts with a letter if possible (optional rule)
    if (!/^[a-z]/.test(base)) {
        base = `u${base}`;
    }

    // Find a unique username: base, base2, base3...
    let candidate = base;
    let suffix = 1;
    while (true) {
        const [rows] = await pool.execute('SELECT id FROM User WHERE username = ? LIMIT 1', [candidate]);
        if (rows.length === 0) return candidate;
        suffix += 1;
        candidate = `${base}${suffix}`;
    }
};

exports.register = async (req, res) => {
    try {
        const { displayName, username: usernameInput, email, password } = req.body;

        const username = usernameInput || await generateUsername(displayName, email);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT * FROM User WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        // Create user
        try {
            await pool.execute(
                'INSERT INTO User (id, username, email, password, displayName) VALUES (?, ?, ?, ?, ?)',
                [userId, username, email, hashedPassword, displayName || username]
            );
        } catch (e) {
            // Backward compatible: if displayName column does not exist
            await pool.execute(
                'INSERT INTO User (id, username, email, password) VALUES (?, ?, ?, ?)',
                [userId, username, email, hashedPassword]
            );
        }

        res.status(201).json({ message: 'User registered successfully', userId, username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM User WHERE email = ?',
            [email]
        );

        const user = users[0];

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.me = async (req, res) => {
    try {
        let users;
        try {
            [users] = await pool.execute(
                'SELECT id, username, email, displayName, avatarUrl FROM User WHERE id = ?',
                [req.userId]
            );
        } catch (e) {
            // Fallback if displayName column does not exist
            [users] = await pool.execute(
                'SELECT id, username, email, avatarUrl FROM User WHERE id = ?',
                [req.userId]
            );
        }

        const user = users[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Determine role based on ADMIN_USER_IDS
        const raw = process.env.ADMIN_USER_IDS || '';
        const admins = raw
            .split(',')
            .map((s) => s.trim().replace(/['"]/g, ''))
            .filter(Boolean);

        const role = admins.includes(user.id) ? 'ADMIN' : 'USER';

        res.json({
            ...user,
            role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
