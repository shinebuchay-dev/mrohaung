const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const logFile = path.join(__dirname, '../../node_errors.log');
const debugLog = (msg) => {
    try {
        const time = new Date().toISOString();
        fs.appendFileSync(logFile, `[${time}] [DEBUG/Email] ${msg}\n`);
        console.log(msg);
    } catch (_) {}
};

const DOMAIN = process.env.EMAIL_DOMAIN || 'mrohaung.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || `shinebuchay@${DOMAIN}`;

/**
 * sendEmail utility that supports either direct MX delivery or SMTP.
 * Designed to send system emails (like verification).
 */
const sendEmail = async (options) => {
    const { email: to, subject, html, text, from, fromName, _isRelayed } = options;
    const isDev = process.env.NODE_ENV === 'development' && !_isRelayed;

    try {
        debugLog(`Attempting to send to ${to}...`);

        // If running locally, try to relay through the production VPS to bypass port 25 blocking
        if (isDev) {
            const vpsUrl = process.env.VPS_URL || 'https://mrohaung.com';
            const relayUrl = `${vpsUrl}/api/email-applications/relay`;
            debugLog(`[DEV MODE] Relaying email to VPS: ${relayUrl}`);
            
            try {
                const response = await fetch(relayUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.JWT_SECRET}`
                    },
                    body: JSON.stringify(options)
                });
                if (response.ok) {
                    console.log('[Email] [DEV MODE] ✅ Relayed successfully to VPS.');
                    return true;
                }
                debugLog(`[DEV MODE] VPS Relay failed (Status: ${response.status}). Falling back to local logging.`);
            } catch (relayErr) {
                debugLog(`[DEV MODE] VPS Relay network error: ${relayErr.message}. Falling back to local logging.`);
            }

            // Fallback dev logging if relay didn't succeed
            console.log(`\n----------------------------------------`);
            console.log(`[Email] [DEV MODE] Local Mock Delivery:`);
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            const linkMatch = html.match(/href="([^"]+)"/);
            if (linkMatch) {
                console.log(`\n👉 VERIFICATION LINK: ${linkMatch[1]}\n`);
            }
            console.log(`----------------------------------------\n`);
            return true;
        }

        let transporter;

        // 1. Check if SMTP is configured (recommended for production)
        if (process.env.SMTP_HOST) {
            debugLog(`Using SMTP: ${process.env.SMTP_HOST}`);
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: options.authUser || process.env.SMTP_USER,
                    pass: options.authPass || process.env.SMTP_PASS,
                },
                tls: { rejectUnauthorized: false }
            });
        } 
        // 2. Direct Delivery (MX lookup) - only if no SMTP is provided
        else {
            const recipientDomain = to.split('@')[1];
            debugLog(`Using Direct MX lookup for domain: ${recipientDomain}`);
            
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
        // Fallback name: User's provided fromName -> User's email prefix -> 'Shine Buchay'
        const senderName = fromName || (from ? from.split('@')[0] : "Shine Buchay");
        const senderEmail = from || SUPPORT_EMAIL;

        debugLog(`Final Sender: "${senderName}" <${senderEmail}>`);

        const mailOptions = {
            from: `"${senderName}" <${senderEmail}>`,
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

