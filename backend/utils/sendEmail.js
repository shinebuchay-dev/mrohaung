const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DOMAIN = process.env.EMAIL_DOMAIN || 'mrohaung.com';
const SUPPORT_EMAIL = `support@${DOMAIN}`;

/**
 * sendEmail utility that supports either direct MX delivery or SMTP.
 * Designed to send system emails (like verification).
 */
const sendEmail = async (options) => {
    const { email: to, subject, html, text } = options;
    const isDev = process.env.NODE_ENV === 'development';

    try {
        console.log(`[Email] Attempting to send to ${to}...`);

        let transporter;

        // 1. Check if SMTP is configured (recommended for production)
        if (process.env.SMTP_HOST) {
            console.log(`[Email] Using SMTP: ${process.env.SMTP_HOST}`);
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                tls: { rejectUnauthorized: false }
            });
        } 
        // 2. Direct Delivery (MX lookup) - only if no SMTP is provided
        else {
            const recipientDomain = to.split('@')[1];
            console.log(`[Email] Using Direct MX lookup for domain: ${recipientDomain}`);
            
            let targetMX;
            try {
                const mxRecords = await dns.resolveMx(recipientDomain);
                if (!mxRecords || mxRecords.length === 0) throw new Error('No MX records');
                mxRecords.sort((a, b) => a.priority - b.priority);
                targetMX = mxRecords[0].exchange;
            } catch (dnsErr) {
                console.warn(`[Email] Could not resolve MX for ${recipientDomain}: ${dnsErr.message}`);
                if (isDev) {
                    console.log(`[Email] [DEV MODE] Skipping real delivery, logging content below:`);
                    console.log(`----------------------------------------`);
                    console.log(`To: ${to}`);
                    console.log(`Subject: ${subject}`);
                    
                    // Try to extract any obvious links from the HTML for easy clicking
                    const linkMatch = html.match(/href="([^"]+)"/);
                    if (linkMatch) {
                        console.log(`\n👉 VERIFICATION LINK: ${linkMatch[1]}\n`);
                    }

                    console.log(`Body:`);
                    console.log(html); // Print full HTML so nothing is missed
                    console.log(`----------------------------------------`);
                    return true; // Return success in dev to not block user flow
                }
                throw dnsErr;
            }

            // DKIM Setup (Optional)
            let dkimOptions;
            try {
                const dkimPath = process.env.DKIM_KEY_PATH || '/etc/ssl/dkim/mrohaung_dkim.pem';
                if (fs.existsSync(dkimPath)) {
                    const dkimPrivateKey = fs.readFileSync(dkimPath, 'utf8');
                    dkimOptions = {
                        domainName: DOMAIN,
                        keySelector: process.env.DKIM_SELECTOR || 'mrohaung',
                        privateKey: dkimPrivateKey
                    };
                }
            } catch (e) {
                console.warn('[Email] DKIM key not found/readable, sending without signing.');
            }

            transporter = nodemailer.createTransport({
                host: targetMX,
                port: 25,
                secure: false,
                tls: { rejectUnauthorized: false },
                dkim: dkimOptions,
                family: 4 // Preferred IPv4
            });
        }

        // 4. Send
        const msgId = `<${uuidv4()}@${DOMAIN}>`;
        const mailOptions = {
            from: `"MROHAUNG Support" <${SUPPORT_EMAIL}>`,
            to,
            subject,
            text: text || "Identity Verification Required",
            html,
            headers: {
                'Message-ID': msgId,
                'X-Mailer': 'MrohaungMailer/1.1',
                'X-Priority': '1 (Highest)',
                'Precedence': 'bulk'
            }
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] ✅ Successfully sent to ${to}. MessageId: ${info.messageId}`);
        
        if (isDev) {
            console.log(`[Email] [DEV MODE] Email was accepted by external server, but might be flagged as Spam.`);
            // Always try to extract any obvious links from the HTML for easy clicking locally
            const linkMatch = html.match(/href="([^"]+)"/);
            if (linkMatch) {
                console.log(`\n👉 VERIFICATION LINK: ${linkMatch[1]}\n`);
            }
        }
        
        return true;

    } catch (err) {
        console.error('[Email] ❌ Failed to send:', err.message);
        
        if (isDev) {
            console.log(`[Email] [DEV MODE] Since we are in development, we are returning success to avoid blocking.`);
            
            // Try to extract any obvious links from the HTML for easy clicking
            const linkMatch = html.match(/href="([^"]+)"/);
            if (linkMatch) {
                console.log(`\n👉 VERIFICATION LINK: ${linkMatch[1]}\n`);
            } else {
                console.log(`[Email] [DEV MODE] Body:`);
                console.log(html);
            }
            return true;
        }
        
        return false;
    }
};

module.exports = sendEmail;

