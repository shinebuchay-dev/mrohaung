const sendEmail = require('./sendEmail');

/**
 * High-level service helper for sending specific email types.
 * Bridged to sendEmail for consistency.
 */
exports.sendVerificationEmail = async (email, token, displayName) => {
    const isDev = process.env.NODE_ENV === 'development';
    const defaultFrontend = isDev ? 'http://localhost:3000' : 'https://mrohaung.com';
    const frontendUrl = process.env.FRONTEND_URL || defaultFrontend;
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    console.log(`[EmailService] Preparing verification for ${displayName} at ${email}`);

    return sendEmail({
        email: email,
        subject: 'Action Required: Verify your identity',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background: white; text-align: center;">
                <h1 style="color: #4f46e5; font-weight: 900; margin-bottom: 20px;">MROHAUNG</h1>
                <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 800;">Verify your identity</h2>
                <p style="color: #666; line-height: 1.6;">Welcome ${displayName}! Please click the button below to verify your account.</p>
                <div style="margin: 30px 0;">
                    <a href="${verifyUrl}" style="background-color: #4f46e5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; display: inline-block; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">Confirm Email Address</a>
                </div>
                <p style="font-size: 12px; color: #999;">If the button doesn't work, copy-paste this link: <br> <span style="word-break: break-all; color: #888;">${verifyUrl}</span></p>
            </div>
        `
    });
};
