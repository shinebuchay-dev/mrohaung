const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

exports.sendVerificationEmail = async (email, token, displayName) => {
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://mrohaung.com'}/verify?token=${token}`;

    const mailOptions = {
        from: `"Infinity Network" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify your ID - Infinity Network',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1e293b;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <h1 style="color: #6366f1; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">INFINITY</h1>
                    <p style="color: #94a3b8; margin-top: 8px; font-size: 14px; text-transform: uppercase; tracking: 2px;">Identity Verification System</p>
                </div>
                
                <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px;">Welcome, ${displayName}!</h2>
                
                <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                    You are one step away from joining the most advanced social network. To activate your secure ID and start exploring the cosmos, please verify your email address.
                </p>
                
                <div style="text-align: center; margin-bottom: 40px;">
                    <a href="${verificationUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; padding: 16px 40px; border-radius: 16px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);">
                        Verify Identity
                    </a>
                </div>
                
                <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                    If the button above doesn't work, copy and paste this link into your browser:<br>
                    <a href="${verificationUrl}" style="color: #6366f1; word-break: break-all;">${verificationUrl}</a>
                </p>
                
                <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #1e293b; text-align: center;">
                    <p style="color: #475569; font-size: 12px; margin: 0;">
                        &copy; 2026 Infinity Network. All systems operational.<br>
                        This is an automated security node. Do not reply.
                    </p>
                </div>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};
