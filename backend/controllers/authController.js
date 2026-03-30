const pool = require('../utils/prisma'); // now returns a mysql2 pool
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

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
        const { displayName, email, password, dob, gender, phoneNumber } = req.body;

        if (!email || !password || !displayName) {
            return res.status(400).json({ message: 'Missing required fields (email, password, displayName)' });
        }

        const username = await generateUsername(displayName, email);

        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT * FROM User WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const verificationToken = crypto.randomBytes(32).toString('hex');

        await pool.execute(
            'INSERT INTO User (id, username, email, password, displayName, dob, gender, phoneNumber, verificationToken, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, username, email, hashedPassword, displayName, dob || null, gender || null, phoneNumber || null, verificationToken, false]
        );

        // Send verification email
        const isDev = process.env.NODE_ENV === 'development';
        const defaultFrontend = isDev ? 'http://localhost:3000' : 'https://mrohaung.com';
        const frontendUrl = process.env.FRONTEND_URL || defaultFrontend;
        const verifyUrl = `${frontendUrl}/?verifyToken=${verificationToken}`;

        try {
            await sendEmail({
                email: email,
                subject: 'Action Required: Verify your identity',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background: white; text-align: center;">
                        <h1 style="color: #4f46e5; font-weight: 900; margin-bottom: 20px;">MROHAUNG</h1>
                        <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 800;">Verify your identity</h2>
                        <p style="color: #666; line-height: 1.6;">Welcome! Please check your email and click the button below to verify your account. <b>Unverified accounts cannot post or interact.</b></p>
                        <div style="margin: 30px 0;">
                            <a href="${verifyUrl}" style="background-color: #4f46e5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; display: inline-block; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">Confirm Email Address</a>
                        </div>
                        <p style="font-size: 12px; color: #999;">If the button doesn't work, copy-paste this link: <br> <span style="word-break: break-all; color: #888;">${verifyUrl}</span></p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }


        // Generate token for auto-login
        const token = jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set HttpOnly cookie for persistence and security
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            token,
            verificationUrl: isDev ? verifyUrl : undefined, // Provide link directly for developers
            user: {
                id: userId,
                username,
                email,
                displayName,
                isVerified: false
            }
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        const [users] = await pool.execute(
            'SELECT id FROM User WHERE verificationToken = ?',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        await pool.execute(
            'UPDATE User SET isVerified = true, verificationToken = NULL WHERE id = ?',
            [users[0].id]
        );

        res.json({ message: 'Email verified successfully! You can now use all features.' });
    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    console.log('--- LOGIN ATTEMPT ---');
    console.log('Body:', req.body);
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

        // Check if verified (DISABLED TEMPORARILY)
        /*
        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Please verify your email first',
                needsVerification: true
            });
        }
        */

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set HttpOnly cookie for persistence and security
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // CRITICAL: Also return token explicitly in response body for immediate frontend use
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                isVerified: !!user.isVerified
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.me = async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email, displayName, avatarUrl, isVerified FROM User WHERE id = ?',
            [req.userId]
        );

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

exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const [users] = await pool.execute(
            'SELECT id, isVerified, verificationToken FROM User WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Generate new token if needed or reuse existing
        const verificationToken = user.verificationToken || crypto.randomBytes(32).toString('hex');

        if (!user.verificationToken) {
            await pool.execute(
                'UPDATE User SET verificationToken = ? WHERE id = ?',
                [verificationToken, user.id]
            );
        }

        const isDev = process.env.NODE_ENV === 'development';
        const defaultFrontend = isDev ? 'http://localhost:3000' : 'https://mrohaung.com';
        const frontendUrl = process.env.FRONTEND_URL || defaultFrontend;
        const verifyUrl = `${frontendUrl}/?verifyToken=${verificationToken}`;

        await sendEmail({
            email: email,
            subject: 'Action Required: Verify your identity',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background: white; text-align: center;">
                    <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 800;">Resend: Verify your identity</h2>
                    <p style="color: #666; line-height: 1.6;">Please confirm your account to continue. Unverified accounts cannot post or interact.</p>
                    <div style="margin: 30px 0;">
                        <a href="${verifyUrl}" style="background-color: #4f46e5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; display: inline-block; font-size: 14px;">Verify Email Now</a>
                    </div>
                </div>
            `
        });

        res.json({ message: 'Verification email sent successfully.' });
    } catch (error) {
        console.error('Resend Verification Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

