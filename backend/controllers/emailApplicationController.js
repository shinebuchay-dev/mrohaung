const pool = require('../utils/prisma');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const sendEmailUtil = require('../utils/sendEmail');

const logFile = path.join(__dirname, '../../node_errors.log');
const debugLog = (msg) => {
    try {
        const time = new Date().toISOString();
        fs.appendFileSync(logFile, `[${time}] [DEBUG/EmailApp] ${msg}\n`);
        console.log(msg);
    } catch (_) {}
};

const DOMAIN = process.env.EMAIL_DOMAIN || 'mrohaung.com';

// ── POST /api/email-applications ────────────────────────────────────────
// Apply for a @mrohaung.com email
    exports.apply = async (req, res) => {
        try {
            const userId = req.userId;
            const { emailPrefix, password } = req.body;

            if (!emailPrefix || !/^[a-z0-9._-]{3,32}$/.test(emailPrefix)) {
                return res.status(400).json({
                    message: 'Email prefix must be 3-32 characters and only contain a-z, 0-9, dots, dashes, underscores.'
                });
            }
            if (!password || password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
            }

            // List of restricted prefixes
            const restricted = ['admin', 'support', 'info', 'root', 'webmaster', 'mail', 'postmaster'];
            if (restricted.includes(emailPrefix.toLowerCase())) {
                return res.status(403).json({ message: 'This email prefix is restricted for system use.' });
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
            // User's requested password is saved here
            const smtpPassword = password;
            const notes = 'Auto-activated for Native Webmail System.';

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

// ── POST /api/email-applications/send ───────────────────────────────────
// Send an email directly using the generated @mrohaung.com credentials
exports.sendEmail = async (req, res) => {
    try {
        const { to, subject, message } = req.body;
        debugLog(`Request to send email to ${to} for user ${req.userId}...`);
        
        if (!to || !subject || !message) {
            return res.status(400).json({ message: 'To, subject, and message are required.' });
        }

        // Get the user's application and displayName
        const [apps] = await pool.execute(`
            SELECT ea.fullEmail, ea.smtpPassword, ea.status, u.displayName
            FROM EmailApplication ea
            JOIN User u ON ea.userId = u.id
            WHERE ea.userId = ?
        `, [req.userId]);

        const app = apps[0];
        debugLog(`Found application: ${JSON.stringify(app)}`);

        if (!app) {
            return res.status(404).json({ message: 'No email application found.' });
        }
        if (app.status !== 'approved') {
            return res.status(403).json({ message: 'Your email application is not approved yet.' });
        }

        // Sanitize recipient for internal check and MX lookup
        const cleanTo = (str) => {
            const match = str.match(/<([^>]+)>/);
            return (match ? match[1] : str).trim().toLowerCase();
        };
        const targetEmail = cleanTo(to);

        if (targetEmail.endsWith(`@${DOMAIN}`)) {
            // Internal Delivery — straight to DB inbox
            const msgId = uuidv4();
            await pool.execute(`
                INSERT INTO EmailMessage (id, ownerEmail, folder, fromAddress, toAddress, subject, bodyText, bodyHtml)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [msgId, targetEmail, 'inbox', app.fullEmail, to, subject, message, `<p>${message}</p>`]);
        } else {
            debugLog(`Calling sendEmailUtil for external recipient...`);
            await sendEmailUtil({
                email: to,
                from: app.fullEmail,
                fromName: app.displayName,
                subject: subject,
                text: message,
                html: `<p>${message}</p>`,
                authUser: app.fullEmail,
                authPass: app.smtpPassword
            });
        }

        // Save a copy in "Sent" folder for the sender
        const sentId = uuidv4();
        await pool.execute(`
            INSERT INTO EmailMessage (id, ownerEmail, folder, fromAddress, toAddress, subject, bodyText, bodyHtml)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [sentId, app.fullEmail, 'sent', app.fullEmail, to, subject, message, `<p>${message}</p>`]);

        res.json({ success: true, message: 'Email sent successfully!' });
    } catch (err) {
        console.error('[EmailApp] sendEmail error:', err);
        const msg = err.response || err.message;
        res.status(500).json({ 
            message: 'Failed to send email. Ensure the system is configured correctly.',
            error: msg
        });
    }
};

// ── POST /api/email-applications/relay ──────────────────────────────────
// Accept and relay emails generated by localhost over to MX Direct Delivery 
exports.relayEmail = async (req, res) => {
    try {
        if (req.headers.authorization !== `Bearer ${process.env.JWT_SECRET}`) {
            return res.status(401).json({ message: 'Unauthorized relay attempt.' });
        }
        
        // Prevent infinite loops if VPS is also accidentally set to dev mode
        const relayOptions = { ...req.body, _isRelayed: true };
        const sendEmailUtil = require('../utils/sendEmail');
        
        await sendEmailUtil(relayOptions);
        res.json({ success: true, message: 'Relayed successfully through VPS.' });
    } catch (err) {
        console.error('[RelayEmail] Error:', err);
        res.status(500).json({ message: 'Relay failed: ' + err.message });
    }
};

// ── GET /api/email-applications/inbox ───────────────────────────────────
exports.getInbox = async (req, res) => {
    try {
        const [[app]] = await pool.execute('SELECT fullEmail FROM EmailApplication WHERE userId = ? AND status = "approved"', [req.userId]);
        if (!app) return res.status(403).json({ message: 'No approved email account.' });

        const [emails] = await pool.execute(
            'SELECT * FROM EmailMessage WHERE ownerEmail = ? AND folder = "inbox" ORDER BY createdAt DESC',
            [app.fullEmail]
        );
        res.json({ emails });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching inbox' });
    }
};

// ── GET /api/email-applications/sent ────────────────────────────────────
exports.getSent = async (req, res) => {
    try {
        const [[app]] = await pool.execute('SELECT fullEmail FROM EmailApplication WHERE userId = ? AND status = "approved"', [req.userId]);
        if (!app) return res.status(403).json({ message: 'No approved email account.' });

        const [emails] = await pool.execute(
            'SELECT * FROM EmailMessage WHERE ownerEmail = ? AND folder = "sent" ORDER BY createdAt DESC',
            [app.fullEmail]
        );
        res.json({ emails });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching sent items' });
    }
};



// ── GET /api/email-applications/folder/:folderName ────────────────────────
exports.getFolderEmails = async (req, res) => {
    try {
        const { folderName } = req.params;
        const [[app]] = await pool.execute('SELECT fullEmail FROM EmailApplication WHERE userId = ? AND status = "approved"', [req.userId]);
        if (!app) return res.status(403).json({ message: 'No approved email account.' });

        const [emails] = await pool.execute(
            'SELECT * FROM EmailMessage WHERE ownerEmail = ? AND folder = ? ORDER BY createdAt DESC',
            [app.fullEmail, folderName]
        );
        res.json({ emails });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching emails' });
    }
};

// ── POST /api/email-applications/action ──────────────────────────────────
exports.emailAction = async (req, res) => {
    try {
        const { emailId, action } = req.body; // action: 'archive', 'trash', 'restore', 'delete' (permanent)
        const [[app]] = await pool.execute('SELECT fullEmail FROM EmailApplication WHERE userId = ? AND status = "approved"', [req.userId]);
        if (!app) return res.status(403).json({ message: 'No approved email account.' });

        const [[email]] = await pool.execute('SELECT folder, fromAddress FROM EmailMessage WHERE id = ? AND ownerEmail = ?', [emailId, app.fullEmail]);
        if (!email) return res.status(404).json({ message: 'Email not found' });

        if (action === 'delete') {
            await pool.execute('DELETE FROM EmailMessage WHERE id = ?', [emailId]);
            return res.json({ success: true, message: 'Deleted permanently' });
        }

        let newFolder = email.folder;
        if (action === 'archive') newFolder = 'archived';
        if (action === 'trash') newFolder = 'trash';
        if (action === 'restore') newFolder = (email.fromAddress === app.fullEmail ? 'sent' : 'inbox');

        await pool.execute('UPDATE EmailMessage SET folder = ? WHERE id = ?', [newFolder, emailId]);
        res.json({ success: true, folder: newFolder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error performing action' });
    }
};

// ── POST /api/email-applications/webhook/receive ─────────────────────────
// Called by Cloudflare Email Routing Worker when an email arrives
const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET || 'mrohaung-cf-webhook-secret-2024';

// Helper to extract clean email from strings like "Name <email@domain.com>"
const cleanEmail = (str) => {
    if (!str) return '';
    const match = str.match(/<([^>]+)>/);
    return (match ? match[1] : str).trim().toLowerCase();
};

exports.webhookReceive = async (req, res) => {
    try {
        const { secret, from, to, subject, bodyText, bodyHtml, rawEmail } = req.body;

        // Validate shared secret
        if (secret !== WEBHOOK_SECRET) {
            console.warn('[Webhook] Unauthorized attempt from:', req.ip);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        let recipient = Array.isArray(to) ? to[0] : to;
        recipient = cleanEmail(recipient);
        const sender = cleanEmail(from);

        if (!recipient) {
            return res.status(400).json({ message: 'Missing recipient' });
        }

        let finalBodyText = bodyText || '';
        let finalBodyHtml = bodyHtml || `<p>${finalBodyText}</p>`;
        let finalSubject = subject || '(No Subject)';

        // If Cloudflare worker sent the raw MIME email, parse it properly
        if (rawEmail) {
            try {
                const { simpleParser } = require('mailparser');
                const parsed = await simpleParser(rawEmail);
                if (parsed.text) finalBodyText = parsed.text;
                if (parsed.html) finalBodyHtml = parsed.html;
                if (parsed.subject) finalSubject = parsed.subject;
            } catch (parseErr) {
                console.error('[Webhook] Failed to parse rawEmail:', parseErr);
            }
        }

        // Case-insensitive lookup for registered @mrohaung.com accounts
        const [[app]] = await pool.execute(
            'SELECT fullEmail FROM EmailApplication WHERE LOWER(fullEmail) = ? AND status = "approved"',
            [recipient]
        );

        if (!app) {
            console.log(`[Webhook] No approved mailbox for recipient: ${recipient}`);
            return res.status(404).json({ message: 'Mailbox not found' });
        }

        const msgId = uuidv4();
        await pool.execute(`
            INSERT INTO EmailMessage (id, ownerEmail, folder, fromAddress, toAddress, subject, bodyText, bodyHtml)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            msgId,
            app.fullEmail,
            'inbox',
            from || 'unknown@external.com',
            app.fullEmail,
            finalSubject,
            finalBodyText,
            finalBodyHtml
        ]);

        console.log(`[Webhook] ✅ Email delivered to inbox: ${app.fullEmail} from ${from}`);
        res.json({ success: true, message: 'Email delivered to inbox.' });

    } catch (err) {
        console.error('[Webhook] Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ── GET /api/email-applications/admin/overview ───────────────────────────
exports.adminOverview = async (req, res) => {
    try {
        // Only admin can see this (checking ADMIN_USER_IDS)
        const admins = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim().replace(/['"]/g, ''));
        if (!admins.includes(req.userId)) return res.status(403).json({ message: 'Admin only.' });

        const [apps] = await pool.execute(`
            SELECT ea.*, u.displayName, u.username as ownerUsername 
            FROM EmailApplication ea
            JOIN User u ON ea.userId = u.id
            ORDER BY ea.createdAt DESC
        `);
        res.json({ applications: apps });
    } catch (err) {
        console.error('[AdminOverview] Error:', err);
        res.status(500).json({ message: 'Error fetching admin overview' });
    }
};
