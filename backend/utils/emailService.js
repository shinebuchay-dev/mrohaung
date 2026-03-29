// const nodemailer = require('nodemailer'); // Disabled to bypass SMTP requirements

exports.sendVerificationEmail = async (email, token, displayName) => {
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://mrohaung.com'}/verify?token=${token}`;

    console.log('----------------------------------------------------');
    console.log('[MOCK EMAIL] Verification Email to:', email);
    console.log('[MOCK EMAIL] Verification URL:', verificationUrl);
    console.log('----------------------------------------------------');
    
    // Simulate successful send without using real SMTP
    return Promise.resolve(true);

    /* Original code:
    const transporter = nodemailer.createTransport({ ... });
    const mailOptions = { ... };
    return transporter.sendMail(mailOptions);
    */
};
