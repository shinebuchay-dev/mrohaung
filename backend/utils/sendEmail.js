const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DOMAIN = process.env.EMAIL_DOMAIN || 'mrohaung.com';
const SUPPORT_EMAIL = `support@${DOMAIN}`;

/**
 * sendEmail utility that uses MX lookup to deliver emails directly.
 * Designed to send system emails (like verification) from support@mrohaung.com
 */
const sendEmail = async (options) => {
    try {
        const { email: to, subject, html, text } = options;
        const recipientDomain = to.split('@')[1];

        console.log(`[SystemEmail] Direct delivery Attempt: ${SUPPORT_EMAIL} -> ${to}`);

        // 1. MX Lookup
        const mxRecords = await dns.resolveMx(recipientDomain);
        if (!mxRecords || mxRecords.length === 0) {
            throw new Error(`No MX records for ${recipientDomain}`);
        }
        mxRecords.sort((a, b) => a.priority - b.priority);
        const targetMX = mxRecords[0].exchange;

        // 2. DKIM Setup
        let dkimOptions;
        try {
            const dkimPrivateKey = fs.readFileSync('/etc/ssl/dkim/mrohaung_dkim.pem', 'utf8');
            dkimOptions = {
                domainName: DOMAIN,
                keySelector: 'mrohaung',
                privateKey: dkimPrivateKey
            };
        } catch (e) {
            console.warn('[SystemEmail] DKIM key not found, sending without signing.');
        }

        // 3. Create Transport
        const transporter = nodemailer.createTransport({
            host: targetMX,
            port: 25,
            secure: false,
            tls: { rejectUnauthorized: false },
            dkim: dkimOptions,
            family: 4 // IPv4 preference
        });

        // 4. Send
        const mailOptions = {
            from: `"MROHAUNG Support" <${SUPPORT_EMAIL}>`,
            to,
            subject,
            text: text || "This is a system email from MROHAUNG.",
            html
        };

        await transporter.sendMail(mailOptions);
        console.log(`[SystemEmail] ✅ Successfully sent to ${to}`);
        return true;
    } catch (err) {
        console.error('[SystemEmail] ❌ Failed to send email:', err.message);
        // We return true in dev if it fails DNS just to not block dev flow, 
        // but in prod we want real delivery.
        return false;
    }
};

module.exports = sendEmail;
