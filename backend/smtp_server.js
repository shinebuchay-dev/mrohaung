const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const pool = require('./utils/prisma');
const { v4: uuidv4 } = require('uuid');

const startSMTPServer = () => {
    const server = new SMTPServer({
        secure: false, // Don't require TLS for now
        authOptional: true, // Allow anyone to send emails IN to our server
        onData(stream, session, callback) {
            simpleParser(stream, async (err, parsed) => {
                if (err) {
                    console.error('[SMTP] Failed to parse email:', err);
                    return callback(err);
                }

                try {
                    // Always use envelope addresses for actual routing (covers BCC, mailing lists, and direct)
                    const toAddresses = session.envelope?.rcptTo ? session.envelope.rcptTo.map(r => r.address) : (parsed.to ? parsed.to.value.map(addr => addr.address) : []);
                    const fromAddress = (session.envelope?.mailFrom && session.envelope.mailFrom.address) ? session.envelope.mailFrom.address : (parsed.from ? parsed.from.value[0].address : 'unknown');
                    const subject = parsed.subject || '(No Subject)';
                    const bodyText = parsed.text || '';
                    const bodyHtml = parsed.html || `<p>${bodyText}</p>`;

                    console.log(`[SMTP] Incoming email from ${fromAddress} to ${toAddresses.join(', ')}`);

                    // Check if any recipient is registered in our database
                    for (let emailAddr of toAddresses) {
                        if (!emailAddr) continue;
                        emailAddr = emailAddr.trim().toLowerCase();

                        const [[app]] = await pool.execute('SELECT fullEmail FROM EmailApplication WHERE fullEmail = ? AND status = "approved"', [emailAddr]);
                        if (app) {
                            console.log(`[SMTP] Saving email to inbox of ${app.fullEmail}`);
                            const msgId = uuidv4();
                            await pool.execute(`
                                INSERT INTO EmailMessage (id, ownerEmail, folder, fromAddress, toAddress, subject, bodyText, bodyHtml)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `, [msgId, app.fullEmail, 'inbox', fromAddress, emailAddr, subject, bodyText, bodyHtml]);
                        } else {
                            console.warn(`[SMTP] Email ignored for ${emailAddr} (No approved application found)`);
                        }
                    }

                    callback();
                } catch (dbErr) {
                    console.error('[SMTP] Database error capturing email:', dbErr);
                    callback(dbErr);
                }
            });
        }
    });

    const SMTP_PORT = process.env.SMTP_LISTEN_PORT || 25;
    
    server.on('error', err => {
        console.error('[SMTP] Server Error:', err.message);
    });

    server.listen(SMTP_PORT, '0.0.0.0', () => {
        console.log(`📧 Mrohaung Custom SMTP Server actively listening on port ${SMTP_PORT}`);
    });
};

module.exports = startSMTPServer;
