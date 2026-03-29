const pool = require('../utils/prisma');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const DOMAIN = process.env.EMAIL_DOMAIN || 'mrohaung.com';

// ── POST /api/email-applications ────────────────────────────────────────
// Apply for a @mrohaung.com email
exports.apply = async (req, res) => {
    try {
        const userId = req.userId;
        const { emailPrefix } = req.body;

        if (!emailPrefix || !/^[a-z0-9._-]{3,32}$/.test(emailPrefix)) {
            return res.status(400).json({
                message: 'Email prefix must be 3-32 characters and only contain a-z, 0-9, dots, dashes, underscores.'
            });
        }

        // Check if user already has an application
        const [[existing]] = await pool.execute(
            'SELECT id, status FROM EmailApplication WHERE userId = ?',
            [userId]
        );
        if (existing) {
            return res.status(409).json({
                message: 'You already have an email application.',
                application: existing
            });
        }

        // Check if the email prefix is taken
        const fullEmail = `${emailPrefix}@${DOMAIN}`;
        const [[taken]] = await pool.execute(
            'SELECT id FROM EmailApplication WHERE fullEmail = ?',
            [fullEmail]
        );
        if (taken) {
            return res.status(409).json({ message: 'This email address is already taken. Please choose another.' });
        }

        const id = uuidv4();
        const smtpPassword = crypto.randomBytes(10).toString('base64').replace(/[+/=]/g, '').substring(0, 14) + '!1';
        const notes = 'Auto-approved by system. Admin must create this mailbox in Hostinger with the generated password.';

        await pool.execute(
            'INSERT INTO EmailApplication (id, userId, emailPrefix, fullEmail, status, smtpPassword, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, userId, emailPrefix, fullEmail, 'approved', smtpPassword, notes]
        );

        res.status(201).json({
            success: true,
            application: { id, emailPrefix, fullEmail, status: 'approved', smtpPassword, notes }
        });
    } catch (err) {
        console.error('[EmailApp] apply error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ── GET /api/email-applications/me ──────────────────────────────────────
// Get current user's application status
exports.getMyApplication = async (req, res) => {
    try {
        const [[app]] = await pool.execute(
            `SELECT ea.id, ea.emailPrefix, ea.fullEmail, ea.status, ea.smtpPassword, ea.notes, ea.createdAt, ea.updatedAt
             FROM EmailApplication ea
             WHERE ea.userId = ?`,
            [req.userId]
        );

        if (!app) {
            return res.json({ application: null });
        }

        // Only show password if approved
        if (app.status !== 'approved') {
            delete app.smtpPassword;
        }

        res.json({ application: app });
    } catch (err) {
        console.error('[EmailApp] getMyApplication error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ── DELETE /api/email-applications/me ────────────────────────────────────
// Cancel pending application
exports.cancelApplication = async (req, res) => {
    try {
        const [[app]] = await pool.execute(
            'SELECT id, status FROM EmailApplication WHERE userId = ?',
            [req.userId]
        );

        if (!app) return res.status(404).json({ message: 'No application found.' });
        if (app.status === 'approved') {
            return res.status(400).json({ message: 'Cannot cancel an approved application.' });
        }

        await pool.execute('DELETE FROM EmailApplication WHERE userId = ?', [req.userId]);
        res.json({ success: true });
    } catch (err) {
        console.error('[EmailApp] cancelApplication error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ── ADMIN: GET /api/admin/email-applications ─────────────────────────────
exports.adminList = async (req, res) => {
    try {
        const status = req.query.status || null;
        let query = `
            SELECT ea.*, u.username, u.displayName, u.email as accountEmail, u.avatarUrl
            FROM EmailApplication ea
            JOIN User u ON ea.userId = u.id
        `;
        const params = [];
        if (status) {
            query += ' WHERE ea.status = ?';
            params.push(status);
        }
        query += ' ORDER BY ea.createdAt DESC';

        const [rows] = await pool.query(query, params);
        res.json({ applications: rows });
    } catch (err) {
        console.error('[EmailApp] adminList error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ── ADMIN: PATCH /api/admin/email-applications/:id ────────────────────────
// Approve or Reject an application
exports.adminAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, notes } = req.body; // action: 'approved' | 'rejected'

        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Use approved or rejected.' });
        }

        const [[app]] = await pool.execute(
            'SELECT * FROM EmailApplication WHERE id = ?',
            [id]
        );
        if (!app) return res.status(404).json({ message: 'Application not found.' });
        if (app.status !== 'pending') {
            return res.status(400).json({ message: `Application is already ${app.status}.` });
        }

        let smtpPassword = null;

        if (action === 'approved') {
            // Generate a strong random password for the email account
            smtpPassword = crypto.randomBytes(10).toString('base64').replace(/[+/=]/g, '').substring(0, 14) + '!1';

            await pool.execute(
                'UPDATE EmailApplication SET status = ?, smtpPassword = ?, notes = ? WHERE id = ?',
                [action, smtpPassword, notes || null, id]
            );
        } else {
            await pool.execute(
                'UPDATE EmailApplication SET status = ?, notes = ? WHERE id = ?',
                [action, notes || null, id]
            );
        }

        res.json({
            success: true,
            action,
            id,
            smtpPassword: action === 'approved' ? smtpPassword : undefined,
            note: action === 'approved'
                ? `Email ${app.fullEmail} approved. Please create this mailbox in Hostinger with the generated password.`
                : `Application rejected.`
        });
    } catch (err) {
        console.error('[EmailApp] adminAction error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
